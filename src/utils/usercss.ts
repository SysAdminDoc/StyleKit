/**
 * Converts UserCSS (.user.css) source code to raw CSS that StyleKit can use.
 *
 * UserCSS format wraps CSS in @-moz-document rules and has a metadata header.
 * This extracts just the CSS rules, stripping the wrapper and metadata.
 */
export const convertUserCssToRaw = (sourceCode: string): string => {
  // Strip the UserCSS metadata header
  const withoutMeta = sourceCode
    .replace(/\/\*\s*==UserStyle==[\s\S]*?==\/UserStyle==\s*\*\//g, '')
    .trim();

  if (!withoutMeta) return '';

  // Three-state machine: OUTSIDE → HEADER (skip until '{') → CONTENT
  // This correctly handles multi-line @-moz-document declarations.
  type State = 'OUTSIDE' | 'HEADER' | 'CONTENT';
  let state: State = 'OUTSIDE';
  let depth = 0;
  let foundMozDoc = false;
  const result: string[] = [];

  for (const line of lines(withoutMeta)) {
    if (state === 'OUTSIDE') {
      if (/@-moz-document/.test(line)) {
        state = 'HEADER';
        foundMozDoc = true;
        // Opening brace may be on the same line as @-moz-document
        for (const ch of line) {
          if (ch === '{') depth++;
        }
        if (depth > 0) state = 'CONTENT';
      } else {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('@namespace')) {
          result.push(line);
        }
      }
    } else if (state === 'HEADER') {
      // Skip lines until we find the opening brace of the block
      for (const ch of line) {
        if (ch === '{') depth++;
      }
      if (depth > 0) state = 'CONTENT';
    } else {
      // CONTENT: track depth, collect CSS lines
      for (const ch of line) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (depth <= 0) {
        // Closing brace of the @-moz-document block
        state = 'OUTSIDE';
        depth = 0;
        const trimmed = line.replace(/\}\s*$/, '').trim();
        if (trimmed) result.push(trimmed);
      } else {
        result.push(line);
      }
    }
  }

  const output = result.join('\n').trim();
  if (foundMozDoc) return output;
  return output || withoutMeta;
};

function lines(src: string): string[] {
  return src.split('\n');
}

/**
 * Extract the URL pattern(s) from @-moz-document rules in UserCSS source.
 * Returns a domain pattern suitable for StyleKit's URL matching.
 */
export const extractUrlPattern = (sourceCode: string): string => {
  const patterns: string[] = [];

  // Match @-moz-document with various function types
  const mozDocRegex =
    /@-moz-document\s+((?:(?:url|url-prefix|domain|regexp)\s*\([^)]*\)\s*,?\s*)+)/gi;

  let match: RegExpExecArray | null;
  while ((match = mozDocRegex.exec(sourceCode)) !== null) {
    const funcs = match[1];
    // Extract domain() values
    const domainRegex = /domain\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;
    let dm: RegExpExecArray | null;
    while ((dm = domainRegex.exec(funcs)) !== null) {
      patterns.push(dm[1]);
    }
    // Extract url-prefix() values
    const prefixRegex = /url-prefix\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;
    let pm: RegExpExecArray | null;
    while ((pm = prefixRegex.exec(funcs)) !== null) {
      try {
        const url = new URL(pm[1]);
        patterns.push(url.hostname + url.pathname);
      } catch {
        patterns.push(pm[1]);
      }
    }
    // Extract url() values
    const urlRegex = /(?<!url-prefix\s*)url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;
    let um: RegExpExecArray | null;
    while ((um = urlRegex.exec(funcs)) !== null) {
      try {
        const url = new URL(um[1]);
        patterns.push(url.hostname + url.pathname);
      } catch {
        patterns.push(um[1]);
      }
    }
  }

  if (patterns.length > 0) {
    return patterns[0];
  }

  return '';
};

/**
 * Extract metadata from a UserCSS header
 */
export const extractUserCssMeta = (
  sourceCode: string
): { name: string; description: string; version: string; author: string } => {
  const meta = { name: '', description: '', version: '', author: '' };
  const headerMatch = sourceCode.match(
    /\/\*\s*==UserStyle==([\s\S]*?)==\/UserStyle==\s*\*\//
  );
  if (!headerMatch) return meta;

  const header = headerMatch[1];
  const nameMatch = header.match(/@name\s+(.+)/);
  const descMatch = header.match(/@description\s+(.+)/);
  const verMatch = header.match(/@version\s+(.+)/);
  const authorMatch = header.match(/@author\s+(.+)/);

  if (nameMatch) meta.name = nameMatch[1].trim();
  if (descMatch) meta.description = descMatch[1].trim();
  if (verMatch) meta.version = verMatch[1].trim();
  if (authorMatch) meta.author = authorMatch[1].trim();

  return meta;
};
