import type {
  TeamSpaceMember,
  TeamSpaceMutation,
  TeamSpaceRole,
  TeamSpaceSummary,
  TeamSpaceUpdateEnvelope,
} from '@stylekit/types';
import { getCurrentTimestamp } from '@stylekit/utils';
import {
  applyCollaborativePack,
  captureCollaborativePack,
  createCollaborativePack,
  deleteCollaborativePack,
  exportCollaborativePack,
  getCollaborativePacks,
  importCollaborativePack,
} from './collaborative-packs';

const STORAGE_KEY = 'stylekit-team-spaces';
const MAX_SPACES = 20;
const MAX_MEMBERS = 100;
const NAME_MAX_LENGTH = 80;
const ROLES = new Set<TeamSpaceRole>(['owner', 'editor', 'viewer']);

type StoredTeamSpace = {
  id: string;
  name: string;
  packId: string;
  createdAt: string;
  updatedAt: string;
  currentMemberId: string;
  members: TeamSpaceMember[];
};

let mutationQueue: Promise<void> = Promise.resolve();

const normalizeName = (name: string, label: string): string => {
  const normalized = name.trim().replace(/\s+/g, ' ');
  if (!normalized) throw new Error(`${label} is required`);
  if (normalized.length > NAME_MAX_LENGTH) {
    throw new Error(`${label} cannot exceed ${NAME_MAX_LENGTH} characters`);
  }
  return normalized;
};

const normalizeRole = (role: unknown): TeamSpaceRole => {
  if (typeof role !== 'string' || !ROLES.has(role as TeamSpaceRole)) {
    throw new Error('Team member role is invalid');
  }
  return role as TeamSpaceRole;
};

const normalizeMembers = (value: unknown): TeamSpaceMember[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_MEMBERS) {
    throw new Error('Team space must contain between 1 and 100 members');
  }
  const ids = new Set<string>();
  const members = value.map((item: unknown) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Team member must be an object');
    }
    const record = item as Record<string, unknown>;
    if (
      typeof record.id !== 'string' ||
      typeof record.name !== 'string' ||
      typeof record.role !== 'string' ||
      !ROLES.has(record.role as TeamSpaceRole) ||
      ids.has(record.id)
    ) {
      throw new Error('Team member identity or role is invalid');
    }
    ids.add(record.id);
    return {
      id: record.id,
      name: normalizeName(record.name, 'Member name'),
      role: normalizeRole(record.role),
    };
  });
  if (!members.some(member => member.role === 'owner')) {
    throw new Error('Team space must retain at least one owner');
  }
  return members;
};

const normalizeStoredSpace = (value: unknown): StoredTeamSpace => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Team space must be an object');
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== 'string' ||
    typeof record.packId !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.createdAt !== 'string' ||
    typeof record.updatedAt !== 'string' ||
    typeof record.currentMemberId !== 'string'
  ) {
    throw new Error('Team space metadata is invalid');
  }
  const members = normalizeMembers(record.members);
  if (!members.some(member => member.id === record.currentMemberId)) {
    throw new Error('Current team member is not in this space');
  }
  return {
    id: record.id,
    packId: record.packId,
    name: normalizeName(record.name, 'Space name'),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    currentMemberId: record.currentMemberId,
    members,
  };
};

const readSpaces = async (): Promise<StoredTeamSpace[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!Array.isArray(stored[STORAGE_KEY])) return [];
  return stored[STORAGE_KEY].slice(0, MAX_SPACES).flatMap((value: unknown) => {
    try {
      return [normalizeStoredSpace(value)];
    } catch {
      return [];
    }
  });
};

const summarizeSpaces = async (
  spaces: StoredTeamSpace[]
): Promise<TeamSpaceSummary[]> => {
  const packs = await getCollaborativePacks();
  return spaces.flatMap(space => {
    const pack = packs.find(candidate => candidate.id === space.packId);
    const current = space.members.find(
      member => member.id === space.currentMemberId
    );
    if (!pack || !current) return [];
    return [
      {
        ...space,
        currentRole: current.role,
        styleCount: pack.styleCount,
      },
    ];
  });
};

const writeSpaces = async (
  spaces: StoredTeamSpace[]
): Promise<TeamSpaceSummary[]> => {
  const bounded = spaces.slice(0, MAX_SPACES);
  await chrome.storage.local.set({ [STORAGE_KEY]: bounded });
  return summarizeSpaces(bounded);
};

const mutateSpaces = <T>(operation: () => Promise<T>): Promise<T> => {
  const result = mutationQueue.then(operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

const getCurrentMember = (space: StoredTeamSpace): TeamSpaceMember => {
  const member = space.members.find(item => item.id === space.currentMemberId);
  if (!member) throw new Error('Current team member is unavailable');
  return member;
};

const requireRole = (
  space: StoredTeamSpace,
  allowed: TeamSpaceRole[]
): TeamSpaceMember => {
  const member = getCurrentMember(space);
  if (!allowed.includes(member.role)) {
    throw new Error(`${member.role} members cannot perform this action`);
  }
  return member;
};

export const getTeamSpaces = async (): Promise<TeamSpaceSummary[]> => {
  await mutationQueue;
  return summarizeSpaces(await readSpaces());
};

export const createTeamSpace = (
  name: string,
  ownerName: string
): Promise<TeamSpaceSummary[]> =>
  mutateSpaces(async () => {
    const normalizedName = normalizeName(name, 'Space name');
    const normalizedOwnerName = normalizeName(ownerName, 'Owner name');
    const spaces = await readSpaces();
    if (spaces.length >= MAX_SPACES) throw new Error('Team space limit reached');
    const packsBefore = await getCollaborativePacks();
    const packsAfter = await createCollaborativePack(normalizedName);
    const pack = packsAfter.find(
      candidate => !packsBefore.some(existing => existing.id === candidate.id)
    );
    if (!pack) throw new Error('Team pack could not be created');
    const timestamp = getCurrentTimestamp();
    const memberId = crypto.randomUUID();
    const space: StoredTeamSpace = {
      id: crypto.randomUUID(),
      name: normalizedName,
      packId: pack.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      currentMemberId: memberId,
      members: [
        {
          id: memberId,
          name: normalizedOwnerName,
          role: 'owner',
        },
      ],
    };
    return writeSpaces([space, ...spaces]);
  });

export const mutateTeamSpace = (
  id: string,
  mutation: TeamSpaceMutation
): Promise<TeamSpaceSummary[]> =>
  mutateSpaces(async () => {
    const spaces = await readSpaces();
    const space = spaces.find(candidate => candidate.id === id);
    if (!space) throw new Error('Team space was not found');
    if (mutation.type === 'capture') {
      requireRole(space, ['owner', 'editor']);
      await captureCollaborativePack(space.packId);
    } else if (mutation.type === 'apply') {
      await applyCollaborativePack(space.packId);
    } else if (mutation.type === 'delete') {
      requireRole(space, ['owner']);
      await deleteCollaborativePack(space.packId);
      return writeSpaces(spaces.filter(candidate => candidate.id !== id));
    } else if (mutation.type === 'add-member') {
      requireRole(space, ['owner']);
      if (space.members.length >= MAX_MEMBERS) {
        throw new Error('Team member limit reached');
      }
      space.members.push({
        id: crypto.randomUUID(),
        name: normalizeName(mutation.name, 'Member name'),
        role: normalizeRole(mutation.role),
      });
    } else if (mutation.type === 'set-role') {
      requireRole(space, ['owner']);
      const member = space.members.find(item => item.id === mutation.memberId);
      if (!member) throw new Error('Team member was not found');
      member.role = normalizeRole(mutation.role);
      normalizeMembers(space.members);
    } else if (mutation.type === 'remove-member') {
      requireRole(space, ['owner']);
      if (mutation.memberId === space.currentMemberId) {
        throw new Error('The active member cannot remove themselves');
      }
      space.members = space.members.filter(
        member => member.id !== mutation.memberId
      );
      normalizeMembers(space.members);
    }
    space.updatedAt = getCurrentTimestamp();
    return writeSpaces(
      spaces.map(candidate => (candidate.id === id ? space : candidate))
    );
  });

export const exportTeamSpace = async (
  id: string,
  recipientId?: string
): Promise<TeamSpaceUpdateEnvelope> => {
  await mutationQueue;
  const space = (await readSpaces()).find(candidate => candidate.id === id);
  if (!space) throw new Error('Team space was not found');
  const author = requireRole(space, ['owner', 'editor']);
  if (recipientId) {
    requireRole(space, ['owner']);
    if (!space.members.some(member => member.id === recipientId)) {
      throw new Error('Invitation recipient is not in this space');
    }
  }
  return {
    version: 1,
    app: 'StyleKit',
    kind: 'team-space-update',
    exportedAt: getCurrentTimestamp(),
    authorId: author.id,
    recipientId,
    space: {
      id: space.id,
      name: space.name,
      createdAt: space.createdAt,
      members: space.members,
    },
    pack: await exportCollaborativePack(space.packId),
  };
};

const parseEnvelope = (value: unknown): TeamSpaceUpdateEnvelope => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Team update must be an object');
  }
  const record = value as Record<string, unknown>;
  const space = record.space as Record<string, unknown> | undefined;
  if (
    record.version !== 1 ||
    record.app !== 'StyleKit' ||
    record.kind !== 'team-space-update' ||
    typeof record.exportedAt !== 'string' ||
    typeof record.authorId !== 'string' ||
    (record.recipientId !== undefined && typeof record.recipientId !== 'string') ||
    !space ||
    typeof space.id !== 'string' ||
    typeof space.name !== 'string' ||
    typeof space.createdAt !== 'string' ||
    !record.pack
  ) {
    throw new Error('Invalid StyleKit team update file');
  }
  const members = normalizeMembers(space.members);
  const author = members.find(member => member.id === record.authorId);
  if (!author || author.role === 'viewer') {
    throw new Error('Team update author does not have edit permission');
  }
  return {
    version: 1,
    app: 'StyleKit',
    kind: 'team-space-update',
    exportedAt: record.exportedAt,
    authorId: record.authorId,
    recipientId: record.recipientId as string | undefined,
    space: {
      id: space.id,
      name: normalizeName(space.name, 'Space name'),
      createdAt: space.createdAt,
      members,
    },
    pack: record.pack as TeamSpaceUpdateEnvelope['pack'],
  };
};

export const importTeamSpace = (
  value: unknown
): Promise<TeamSpaceSummary[]> =>
  mutateSpaces(async () => {
    const envelope = parseEnvelope(value);
    const spaces = await readSpaces();
    const existing = spaces.find(space => space.id === envelope.space.id);
    if (!existing && spaces.length >= MAX_SPACES) {
      throw new Error('Team space limit reached');
    }
    if (!existing && !envelope.recipientId) {
      throw new Error('A targeted invitation is required to join a team space');
    }
    const currentMemberId = existing?.currentMemberId || envelope.recipientId;
    if (
      !currentMemberId ||
      !envelope.space.members.some(member => member.id === currentMemberId)
    ) {
      throw new Error('The invitation recipient is not a team member');
    }
    const existingAuthor = existing?.members.find(
      member => member.id === envelope.authorId
    );
    if (existing && (!existingAuthor || existingAuthor.role === 'viewer')) {
      throw new Error('Team update author does not have edit permission');
    }
    const authorCanManageMembers = existingAuthor?.role === 'owner';
    await importCollaborativePack(envelope.pack);
    const merged: StoredTeamSpace = {
      id: envelope.space.id,
      name:
        existing && !authorCanManageMembers
          ? existing.name
          : envelope.space.name,
      packId: envelope.pack.pack.id,
      createdAt: existing?.createdAt || envelope.space.createdAt,
      updatedAt: getCurrentTimestamp(),
      currentMemberId,
      members:
        existing && !authorCanManageMembers
          ? existing.members
          : envelope.space.members,
    };
    return writeSpaces([
      merged,
      ...spaces.filter(space => space.id !== merged.id),
    ]);
  });

export const resetTeamSpacesForTests = (): void => {
  mutationQueue = Promise.resolve();
};

export const TEAM_SPACES_STORAGE_KEY = STORAGE_KEY;
