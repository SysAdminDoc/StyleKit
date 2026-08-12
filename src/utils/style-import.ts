import { safeParse } from '@stylekit/css';
import { StyleMap, StyleWithoutUrl } from '@stylekit/types';

export type StyleImportEnvelope = {
  version: 2;
  app: 'StyleKit';
  exportedAt: string;
  styles: StyleMap;
};

export type StyleImportDiff = {
  added: number;
  changed: number;
  removed: number;
  unchanged: number;
  total: number;
};

export type StyleImportPreview = {
  styles: StyleMap;
  diff: StyleImportDiff;
};

const VERSIONED_SCHEMA = 2;

export const isSafeCssContentType = (contentType: string | null): boolean => {
  if (!contentType) return true;
  const mime = contentType.split(';')[0].trim().toLowerCase();
  return [
    'text/css',
    'text/plain',
    'application/octet-stream',
    'application/x-css',
  ].includes(mime);
};

const normalizeStyle = (style: StyleWithoutUrl): StyleWithoutUrl => ({
  css: style.css,
  enabled: style.enabled,
  readability: style.readability ?? false,
  shadowRoots: style.shadowRoots ?? false,
  modifiedTime: style.modifiedTime,
});

const styleChanged = (
  existing: StyleWithoutUrl,
  incoming: StyleWithoutUrl
): boolean => {
  const left = normalizeStyle(existing);
  const right = normalizeStyle(incoming);
  return JSON.stringify(left) !== JSON.stringify(right);
};

export const isValidStyleMap = (data: unknown): data is StyleMap => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (typeof key !== 'string' || !key.trim()) return false;
    if (!value || typeof value !== 'object' || Array.isArray(value))
      return false;

    const style = value as Record<string, unknown>;
    if (typeof style.css !== 'string') return false;
    if (typeof style.enabled !== 'boolean') return false;
    if (
      typeof style.readability !== 'boolean' &&
      style.readability !== undefined
    ) {
      return false;
    }
    if (
      typeof style.shadowRoots !== 'boolean' &&
      style.shadowRoots !== undefined
    ) {
      return false;
    }
    if (
      typeof style.modifiedTime !== 'string' &&
      style.modifiedTime !== undefined
    ) {
      return false;
    }
  }

  return true;
};

export const parseStyleImportPayload = (data: unknown): StyleImportEnvelope => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid format: expected a StyleKit style backup object');
  }

  const record = data as Record<string, unknown>;
  const hasVersionedSchema = 'version' in record;
  const styles = hasVersionedSchema ? record.styles : record;

  if (
    hasVersionedSchema &&
    record.version !== 1 &&
    record.version !== VERSIONED_SCHEMA
  ) {
    throw new Error(`Unsupported StyleKit import version: ${record.version}`);
  }

  if (!isValidStyleMap(styles)) {
    throw new Error(
      'Invalid format: expected URL keys with { css, enabled } style values'
    );
  }

  return {
    version: VERSIONED_SCHEMA,
    app: 'StyleKit',
    exportedAt:
      typeof record.exportedAt === 'string'
        ? record.exportedAt
        : new Date().toISOString(),
    styles,
  };
};

export const createStyleImportEnvelope = (
  styles: StyleMap
): StyleImportEnvelope => {
  if (!isValidStyleMap(styles)) {
    throw new Error('Invalid StyleKit styles object');
  }

  return {
    version: VERSIONED_SCHEMA,
    app: 'StyleKit',
    exportedAt: new Date().toISOString(),
    styles,
  };
};

export const assertValidImportCss = (css: string): void => {
  if (!css.trim()) {
    throw new Error('CSS is empty');
  }

  safeParse(css);
};

export const createSingleStyleImport = (
  url: string,
  css: string,
  modifiedTime: string
): StyleImportEnvelope => {
  if (!url.trim()) {
    throw new Error('A target URL pattern is required');
  }

  assertValidImportCss(css);

  return createStyleImportEnvelope({
    [url]: {
      css,
      enabled: true,
      readability: false,
      shadowRoots: false,
      modifiedTime,
    },
  });
};

export const diffStyleImports = (
  currentStyles: StyleMap,
  incomingStyles: StyleMap,
  mode: 'replace' | 'merge'
): StyleImportDiff => {
  const diff: StyleImportDiff = {
    added: 0,
    changed: 0,
    removed: 0,
    unchanged: 0,
    total: Object.keys(incomingStyles).length,
  };

  for (const [url, style] of Object.entries(incomingStyles)) {
    if (!currentStyles[url]) {
      diff.added += 1;
    } else if (styleChanged(currentStyles[url], style)) {
      diff.changed += 1;
    } else {
      diff.unchanged += 1;
    }
  }

  if (mode === 'replace') {
    diff.removed = Object.keys(currentStyles).filter(
      url => !incomingStyles[url]
    ).length;
  }

  return diff;
};

export const getImportDiffText = (diff: StyleImportDiff): string =>
  `${diff.added} added, ${diff.changed} changed, ${diff.removed} removed`;

export const createImportPreview = (
  currentStyles: StyleMap,
  incomingStyles: StyleMap,
  mode: 'replace' | 'merge'
): StyleImportPreview => ({
  styles: incomingStyles,
  diff: diffStyleImports(currentStyles, incomingStyles, mode),
});
