import {
  captureCollaborativePack,
  createCollaborativePack,
  exportCollaborativePack,
  getCollaborativePacks,
} from '../collaborative-packs';
import {
  createTeamSpace,
  exportTeamSpace,
  importTeamSpace,
  mutateTeamSpace,
  resetTeamSpacesForTests,
  TEAM_SPACES_STORAGE_KEY,
} from '../team-spaces';

vi.mock('../collaborative-packs', () => ({
  applyCollaborativePack: vi.fn(async () => []),
  captureCollaborativePack: vi.fn(async () => []),
  createCollaborativePack: vi.fn(),
  deleteCollaborativePack: vi.fn(async () => []),
  exportCollaborativePack: vi.fn(),
  getCollaborativePacks: vi.fn(),
  importCollaborativePack: vi.fn(async () => []),
}));

const pack = {
  id: 'pack-1',
  name: 'Design team',
  createdAt: '2026-08-12T10:00:00.000Z',
  updatedAt: '2026-08-12T10:00:00.000Z',
  styleCount: 2,
  stateVector: 'AQID',
};

describe('role-based team spaces', () => {
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    storageData = {};
    resetTeamSpacesForTests();
    vi.resetAllMocks();
    vi.mocked(getCollaborativePacks)
      .mockResolvedValueOnce([])
      .mockResolvedValue([pack]);
    vi.mocked(createCollaborativePack).mockResolvedValue([pack]);
    vi.mocked(exportCollaborativePack).mockResolvedValue({
      version: 1,
      app: 'StyleKit',
      kind: 'collaborative-style-pack',
      exportedAt: pack.updatedAt,
      pack: { id: pack.id, name: pack.name },
      update: 'AQID',
    });
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn(async (key: string) => ({ [key]: storageData[key] })),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(storageData, structuredClone(items));
          }),
        },
      },
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('lets owners add members and export targeted invitations', async () => {
    let spaces = await createTeamSpace('Design team', 'Alice');
    spaces = await mutateTeamSpace(spaces[0].id, {
      type: 'add-member',
      name: 'Bob',
      role: 'viewer',
    });
    const bob = spaces[0].members.find(member => member.name === 'Bob');
    expect(bob?.role).toBe('viewer');

    const invite = await exportTeamSpace(spaces[0].id, bob?.id);
    expect(invite.recipientId).toBe(bob?.id);
    expect(invite.space.members).toContainEqual(
      expect.objectContaining({ name: 'Bob', role: 'viewer' })
    );
  });

  it('blocks viewers from capturing or publishing team edits', async () => {
    let spaces = await createTeamSpace('Design team', 'Alice');
    spaces = await mutateTeamSpace(spaces[0].id, {
      type: 'add-member',
      name: 'Bob',
      role: 'viewer',
    });
    const stored = storageData[TEAM_SPACES_STORAGE_KEY] as Array<{
      currentMemberId: string;
      members: Array<{ id: string; name: string }>;
    }>;
    stored[0].currentMemberId = stored[0].members.find(
      member => member.name === 'Bob'
    )?.id as string;

    await expect(
      mutateTeamSpace(spaces[0].id, { type: 'capture' })
    ).rejects.toThrow('viewer members');
    await expect(exportTeamSpace(spaces[0].id)).rejects.toThrow(
      'viewer members'
    );
    expect(captureCollaborativePack).not.toHaveBeenCalled();
  });

  it('rejects an existing viewer who claims an elevated role in an update', async () => {
    let spaces = await createTeamSpace('Design team', 'Alice');
    spaces = await mutateTeamSpace(spaces[0].id, {
      type: 'add-member',
      name: 'Bob',
      role: 'viewer',
    });
    const bob = spaces[0].members.find(member => member.name === 'Bob');
    const envelope = await exportTeamSpace(spaces[0].id, bob?.id);
    envelope.authorId = bob?.id as string;
    envelope.space.members = envelope.space.members.map(member =>
      member.id === bob?.id ? { ...member, role: 'owner' } : member
    );

    await expect(importTeamSpace(envelope)).rejects.toThrow(
      'does not have edit permission'
    );
  });
});
