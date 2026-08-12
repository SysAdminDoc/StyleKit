import * as Y from 'yjs';
import type {
  CollaborativePackSummary,
  CollaborativePackUpdateEnvelope,
} from '@stylekit/types';
import { getCurrentTimestamp } from '@stylekit/utils';
import {
  applyCollaborativeUpdate,
  createCollaborativeDocument,
  encodeCollaborativeDocument,
  getCollaborativeStateVector,
  materializeCollaborativeDocument,
  MAX_COLLABORATIVE_PACKS,
  normalizeCollaborativePackName,
  parseCollaborativePackEnvelope,
  updateCollaborativeDocument,
} from '../utils/collaborative-packs';
import {
  createStylesRollbackSnapshot,
  getAll as getAllStyles,
  setAll as setAllStyles,
} from './styles';

const STORAGE_KEY = 'stylekit-collaborative-packs';

type StoredCollaborativePack = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  update: string;
};

let mutationQueue: Promise<void> = Promise.resolve();

const loadDocument = (pack: StoredCollaborativePack): Y.Doc => {
  const doc = new Y.Doc();
  applyCollaborativeUpdate(doc, pack.update);
  if (doc.getMap<unknown>('metadata').get('id') !== pack.id) {
    throw new Error('Collaborative pack identity does not match its update');
  }
  return doc;
};

const summarizePack = (
  pack: StoredCollaborativePack,
  doc = loadDocument(pack)
): CollaborativePackSummary => ({
  id: pack.id,
  name: pack.name,
  createdAt: pack.createdAt,
  updatedAt: pack.updatedAt,
  styleCount: Object.keys(materializeCollaborativeDocument(doc).styles).length,
  stateVector: getCollaborativeStateVector(doc),
});

const readPacks = async (): Promise<StoredCollaborativePack[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!Array.isArray(stored[STORAGE_KEY])) return [];
  return stored[STORAGE_KEY]
    .slice(0, MAX_COLLABORATIVE_PACKS)
    .flatMap((value: unknown) => {
      try {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return [];
        }
        const record = value as Record<string, unknown>;
        if (
          typeof record.id !== 'string' ||
          typeof record.name !== 'string' ||
          typeof record.createdAt !== 'string' ||
          typeof record.updatedAt !== 'string' ||
          typeof record.update !== 'string'
        ) {
          return [];
        }
        const pack: StoredCollaborativePack = {
          id: record.id,
          name: normalizeCollaborativePackName(record.name),
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
          update: record.update,
        };
        loadDocument(pack);
        return [pack];
      } catch {
        return [];
      }
    });
};

const writePacks = async (
  packs: StoredCollaborativePack[]
): Promise<CollaborativePackSummary[]> => {
  const bounded = packs.slice(0, MAX_COLLABORATIVE_PACKS);
  await chrome.storage.local.set({ [STORAGE_KEY]: bounded });
  return bounded.map(pack => summarizePack(pack));
};

const mutatePacks = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = mutationQueue.then(operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

export const getCollaborativePacks = async (): Promise<
  CollaborativePackSummary[]
> => {
  await mutationQueue;
  return (await readPacks()).map(pack => summarizePack(pack));
};

export const createCollaborativePack = (
  name: string
): Promise<CollaborativePackSummary[]> =>
  mutatePacks(async () => {
    const packs = await readPacks();
    if (packs.length >= MAX_COLLABORATIVE_PACKS) {
      throw new Error('Collaborative pack limit reached');
    }
    const styles = await getAllStyles();
    if (Object.keys(styles).length === 0) {
      throw new Error('Save at least one style before creating a pack');
    }
    const id = crypto.randomUUID();
    const timestamp = getCurrentTimestamp();
    const packName = normalizeCollaborativePackName(name);
    const doc = createCollaborativeDocument(id, packName, styles);
    return writePacks([
      {
        id,
        name: packName,
        createdAt: timestamp,
        updatedAt: timestamp,
        update: encodeCollaborativeDocument(doc),
      },
      ...packs,
    ]);
  });

export const captureCollaborativePack = (
  id: string
): Promise<CollaborativePackSummary[]> =>
  mutatePacks(async () => {
    const packs = await readPacks();
    const current = packs.find(pack => pack.id === id);
    if (!current) throw new Error('Collaborative pack was not found');
    const doc = loadDocument(current);
    updateCollaborativeDocument(doc, await getAllStyles());
    const updated: StoredCollaborativePack = {
      ...current,
      updatedAt: getCurrentTimestamp(),
      update: encodeCollaborativeDocument(doc),
    };
    return writePacks(packs.map(pack => (pack.id === id ? updated : pack)));
  });

export const exportCollaborativePack = async (
  id: string
): Promise<CollaborativePackUpdateEnvelope> => {
  await mutationQueue;
  const pack = (await readPacks()).find(candidate => candidate.id === id);
  if (!pack) throw new Error('Collaborative pack was not found');
  return {
    version: 1,
    app: 'StyleKit',
    kind: 'collaborative-style-pack',
    exportedAt: getCurrentTimestamp(),
    pack: { id: pack.id, name: pack.name },
    update: pack.update,
  };
};

export const importCollaborativePack = (
  input: unknown
): Promise<CollaborativePackSummary[]> =>
  mutatePacks(async () => {
    const envelope = parseCollaborativePackEnvelope(input);
    const packs = await readPacks();
    const existing = packs.find(pack => pack.id === envelope.pack.id);
    if (!existing && packs.length >= MAX_COLLABORATIVE_PACKS) {
      throw new Error('Collaborative pack limit reached');
    }
    const doc = existing ? loadDocument(existing) : new Y.Doc();
    applyCollaborativeUpdate(doc, envelope.update);
    const timestamp = getCurrentTimestamp();
    const merged: StoredCollaborativePack = {
      id: envelope.pack.id,
      name: existing?.name || envelope.pack.name,
      createdAt: existing?.createdAt || timestamp,
      updatedAt: timestamp,
      update: encodeCollaborativeDocument(doc),
    };
    return writePacks([
      merged,
      ...packs.filter(pack => pack.id !== merged.id),
    ]);
  });

export const applyCollaborativePack = (
  id: string
): Promise<CollaborativePackSummary[]> =>
  mutatePacks(async () => {
    const packs = await readPacks();
    const pack = packs.find(candidate => candidate.id === id);
    if (!pack) throw new Error('Collaborative pack was not found');
    const materialized = materializeCollaborativeDocument(loadDocument(pack));
    const styles = await getAllStyles();
    for (const url of materialized.deletedUrls) delete styles[url];
    Object.assign(styles, materialized.styles);
    await createStylesRollbackSnapshot('collaboration-merge');
    await setAllStyles(styles);
    return packs.map(candidate => summarizePack(candidate));
  });

export const deleteCollaborativePack = (
  id: string
): Promise<CollaborativePackSummary[]> =>
  mutatePacks(async () =>
    writePacks((await readPacks()).filter(pack => pack.id !== id))
  );

export const resetCollaborativePacksForTests = (): void => {
  mutationQueue = Promise.resolve();
};

export const COLLABORATIVE_PACKS_STORAGE_KEY = STORAGE_KEY;
