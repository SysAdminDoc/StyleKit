import * as Y from 'yjs';
import type {
  CollaborativePackUpdateEnvelope,
  StyleMap,
  StyleWithoutUrl,
} from '@stylekit/types';
import { getCurrentTimestamp } from '@stylekit/utils';

export const MAX_COLLABORATIVE_PACKS = 20;
export const MAX_COLLABORATIVE_STYLES = 500;
export const MAX_COLLABORATIVE_UPDATE_BYTES = 5 * 1024 * 1024;
const MAX_CSS_BYTES = 1024 * 1024;
const NAME_MAX_LENGTH = 80;

export type MaterializedCollaborativePack = {
  styles: StyleMap;
  deletedUrls: string[];
};

export const normalizeCollaborativePackName = (name: string): string => {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (!normalized) throw new Error('Pack name is required');
  if (normalized.length > NAME_MAX_LENGTH) {
    throw new Error(`Pack name cannot exceed ${NAME_MAX_LENGTH} characters`);
  }
  return normalized;
};

export const encodeCollaborativeBytes = (bytes: Uint8Array): string => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

const decodeBase64 = (value: string): Uint8Array => {
  if (
    !value ||
    value.length >
      Math.ceil((MAX_COLLABORATIVE_UPDATE_BYTES * 4) / 3) + 4 ||
    !/^[a-zA-Z0-9+/]+={0,2}$/.test(value)
  ) {
    throw new Error('Collaborative update is not valid base64');
  }
  let binary: string;
  try {
    binary = atob(value);
  } catch {
    throw new Error('Collaborative update is not valid base64');
  }
  if (binary.length > MAX_COLLABORATIVE_UPDATE_BYTES) {
    throw new Error('Collaborative update exceeds 5 MB');
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const getStylesMap = (doc: Y.Doc): Y.Map<Y.Map<unknown>> =>
  doc.getMap<Y.Map<unknown>>('styles');

const getStyleText = (node: Y.Map<unknown>): Y.Text => {
  const existing = node.get('css');
  if (existing instanceof Y.Text) return existing;
  const text = new Y.Text();
  node.set('css', text);
  return text;
};

const updateText = (text: Y.Text, nextValue: string): void => {
  const currentValue = text.toString();
  if (currentValue === nextValue) return;
  let prefix = 0;
  while (
    prefix < currentValue.length &&
    prefix < nextValue.length &&
    currentValue[prefix] === nextValue[prefix]
  ) {
    prefix++;
  }
  let suffix = 0;
  while (
    suffix < currentValue.length - prefix &&
    suffix < nextValue.length - prefix &&
    currentValue[currentValue.length - suffix - 1] ===
      nextValue[nextValue.length - suffix - 1]
  ) {
    suffix++;
  }
  const deleteLength = currentValue.length - prefix - suffix;
  if (deleteLength > 0) text.delete(prefix, deleteLength);
  const insertion = nextValue.slice(prefix, nextValue.length - suffix);
  if (insertion) text.insert(prefix, insertion);
};

const validateStyle = (url: string, style: StyleWithoutUrl): void => {
  if (!url || url.length > 2048) {
    throw new Error('Pack contains an invalid style URL');
  }
  if (typeof style.css !== 'string') throw new Error('Pack CSS must be text');
  if (new TextEncoder().encode(style.css).byteLength > MAX_CSS_BYTES) {
    throw new Error(`Pack CSS for ${url} exceeds 1 MB`);
  }
};

export const createCollaborativeDocument = (
  id: string,
  name: string,
  styles: StyleMap
): Y.Doc => {
  const doc = new Y.Doc();
  const metadata = doc.getMap<unknown>('metadata');
  metadata.set('id', id);
  metadata.set('name', normalizeCollaborativePackName(name));
  metadata.set('version', 1);
  updateCollaborativeDocument(doc, styles);
  return doc;
};

export const updateCollaborativeDocument = (
  doc: Y.Doc,
  styles: StyleMap
): void => {
  const entries = Object.entries(styles);
  if (entries.length > MAX_COLLABORATIVE_STYLES) {
    throw new Error(
      `Collaborative packs support at most ${MAX_COLLABORATIVE_STYLES} styles`
    );
  }
  entries.forEach(([url, style]) => validateStyle(url, style));
  const styleMap = getStylesMap(doc);
  const currentUrls = new Set(Object.keys(styles));
  doc.transact(() => {
    for (const [url, node] of styleMap.entries()) {
      if (!currentUrls.has(url)) node.set('deleted', true);
    }
    for (const [url, style] of entries) {
      let node = styleMap.get(url);
      if (!(node instanceof Y.Map)) {
        node = new Y.Map<unknown>();
        styleMap.set(url, node);
      }
      updateText(getStyleText(node), style.css);
      node.set('enabled', style.enabled !== false);
      node.set('readability', style.readability === true);
      node.set('shadowRoots', style.shadowRoots === true);
      node.set('modifiedTime', style.modifiedTime || getCurrentTimestamp());
      node.set('deleted', false);
    }
  }, 'stylekit-capture');
};

export const materializeCollaborativeDocument = (
  doc: Y.Doc
): MaterializedCollaborativePack => {
  const styles: StyleMap = {};
  const deletedUrls: string[] = [];
  for (const [url, node] of getStylesMap(doc).entries()) {
    if (node.get('deleted') === true) {
      deletedUrls.push(url);
      continue;
    }
    const css = getStyleText(node).toString();
    const modifiedTime = node.get('modifiedTime');
    const style: StyleWithoutUrl = {
      css,
      enabled: node.get('enabled') !== false,
      readability: node.get('readability') === true,
      shadowRoots: node.get('shadowRoots') === true,
      modifiedTime:
        typeof modifiedTime === 'string' ? modifiedTime : getCurrentTimestamp(),
    };
    validateStyle(url, style);
    styles[url] = style;
  }
  if (
    Object.keys(styles).length + deletedUrls.length >
    MAX_COLLABORATIVE_STYLES
  ) {
    throw new Error(
      `Collaborative packs support at most ${MAX_COLLABORATIVE_STYLES} styles`
    );
  }
  return { styles, deletedUrls };
};

export const encodeCollaborativeDocument = (doc: Y.Doc): string =>
  encodeCollaborativeBytes(Y.encodeStateAsUpdate(doc));

export const getCollaborativeStateVector = (doc: Y.Doc): string =>
  encodeCollaborativeBytes(Y.encodeStateVector(doc));

export const applyCollaborativeUpdate = (
  doc: Y.Doc,
  update: string
): void => {
  Y.applyUpdate(doc, decodeBase64(update), 'stylekit-import');
  materializeCollaborativeDocument(doc);
};

export const parseCollaborativePackEnvelope = (
  value: unknown
): CollaborativePackUpdateEnvelope => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Collaborative pack file must be an object');
  }
  const record = value as Record<string, unknown>;
  const pack = record.pack as Record<string, unknown> | undefined;
  if (
    record.version !== 1 ||
    record.app !== 'StyleKit' ||
    record.kind !== 'collaborative-style-pack' ||
    typeof record.exportedAt !== 'string' ||
    !pack ||
    typeof pack.id !== 'string' ||
    typeof pack.name !== 'string' ||
    typeof record.update !== 'string'
  ) {
    throw new Error('Invalid StyleKit collaborative pack file');
  }
  const doc = new Y.Doc();
  applyCollaborativeUpdate(doc, record.update);
  if (doc.getMap<unknown>('metadata').get('id') !== pack.id) {
    throw new Error('Collaborative pack identity does not match its update');
  }
  return {
    version: 1,
    app: 'StyleKit',
    kind: 'collaborative-style-pack',
    exportedAt: record.exportedAt,
    pack: {
      id: pack.id,
      name: normalizeCollaborativePackName(pack.name),
    },
    update: record.update,
  };
};
