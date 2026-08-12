import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const KEY_PATTERN = /^[a-z0-9_]+$/i;
const PLACEHOLDER_PATTERN = /\$([a-z][a-z0-9_]*)\$/gi;

const getPlaceholders = (message, context) => {
  const placeholders = Array.from(
    message.matchAll(PLACEHOLDER_PATTERN),
    match => match[1].toLowerCase()
  );
  if (message.replace(PLACEHOLDER_PATTERN, '').includes('$')) {
    throw new Error(`${context}: malformed $placeholder$ syntax`);
  }
  return Array.from(new Set(placeholders)).sort();
};

export const parseLocaleConfig = (source, fileName = '<locale>') => {
  const messages = new Map();
  const entries = [];
  let current = null;

  const commit = () => {
    if (!current) return;
    current.message = current.lines.join('\n').trim();
    current.placeholders = getPlaceholders(
      current.message,
      `${fileName}:${current.line}`
    );
    entries.push(current);
    messages.set(current.key, current);
  };

  source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .forEach((line, index) => {
      if (line.startsWith('@')) {
        commit();
        const key = line.slice(1).trim();
        if (!KEY_PATTERN.test(key)) {
          throw new Error(
            `${fileName}:${index + 1}: malformed locale key "${line}"`
          );
        }
        current = { key, line: index + 1, lines: [] };
      } else if (current && !line.trimStart().startsWith('#')) {
        current.lines.push(line);
      }
    });
  commit();

  return { entries, messages };
};

export const readLocaleCatalogs = localesDir => {
  const catalogs = new Map();
  for (const file of readdirSync(localesDir)
    .filter(name => name.endsWith('.config'))
    .sort()) {
    catalogs.set(
      basename(file, '.config'),
      parseLocaleConfig(readFileSync(join(localesDir, file), 'utf8'), file)
    );
  }
  return catalogs;
};

export const getLocaleIssues = (catalogs, sourceLocale = 'en') => {
  const source = catalogs.get(sourceLocale);
  if (!source) return [`Missing source locale: ${sourceLocale}.config`];

  const sourceKeys = new Set(source.messages.keys());
  const issues = [];
  for (const [locale, catalog] of catalogs) {
    if (locale === sourceLocale) continue;

    const keys = new Set(catalog.messages.keys());
    const missing = Array.from(sourceKeys).filter(key => !keys.has(key));
    const extra = Array.from(keys).filter(key => !sourceKeys.has(key));
    if (missing.length) issues.push(`${locale}: missing ${missing.join(', ')}`);
    if (extra.length) issues.push(`${locale}: extra ${extra.join(', ')}`);

    for (const key of sourceKeys) {
      const sourceEntry = source.messages.get(key);
      const entry = catalog.messages.get(key);
      if (!entry) continue;
      if (entry.placeholders.join(',') !== sourceEntry.placeholders.join(',')) {
        issues.push(
          `${locale}.${key}: placeholders [${entry.placeholders.join(', ')}] do not match source [${sourceEntry.placeholders.join(', ')}]`
        );
      }
    }
  }
  return issues;
};

export const toChromeMessages = catalog =>
  Object.fromEntries(
    Array.from(catalog.messages, ([key, entry]) => {
      const value = { message: entry.message };
      if (entry.placeholders.length) {
        value.placeholders = Object.fromEntries(
          entry.placeholders.map(name => [name, { content: '$1' }])
        );
      }
      return [key, value];
    })
  );

export const fixLocaleCompleteness = (localesDir, sourceLocale = 'en') => {
  const catalogs = readLocaleCatalogs(localesDir);
  const source = catalogs.get(sourceLocale);
  if (!source) throw new Error(`Missing source locale: ${sourceLocale}.config`);
  const sourceKeys = new Set(source.messages.keys());

  for (const [locale, catalog] of catalogs) {
    if (locale === sourceLocale) continue;
    const filePath = join(localesDir, `${locale}.config`);
    let output = readFileSync(filePath, 'utf8').trimEnd();
    const extraKeys = Array.from(catalog.messages.keys()).filter(
      key => !sourceKeys.has(key)
    );
    for (const key of extraKeys) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      output = output.replace(
        new RegExp(
          `^@${escapedKey}\\s*\\n[\\s\\S]*?(?=^@|(?![\\s\\S]))`,
          'gim'
        ),
        ''
      );
    }

    const present = new Set(catalog.messages.keys());
    const missingEntries = Array.from(source.messages.values()).filter(
      entry => !present.has(entry.key)
    );

    if (missingEntries.length) {
      output += `\n\n#==== English fallbacks pending translation ====\n\n${missingEntries
        .map(entry => `@${entry.key}\n${entry.message}`)
        .join('\n\n')}`;
    }
    writeFileSync(filePath, `${output.trimEnd()}\n`, 'utf8');
  }
};
