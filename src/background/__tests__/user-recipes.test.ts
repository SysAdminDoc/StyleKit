import {
  deleteUserRecipe,
  getUserRecipes,
  importUserRecipes,
  resetUserRecipesForTests,
  saveUserRecipe,
} from '../user-recipes';

describe('background user recipe storage', () => {
  let storageData: Record<string, unknown>;

  beforeEach(() => {
    storageData = {};
    resetUserRecipesForTests();
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

  it('creates, updates, and deletes recipes without changing their identity', async () => {
    const created = await saveUserRecipe(
      {
        name: 'Focus',
        description: '',
        sites: ['example.com'],
        css: '.noise { display: none; }',
      },
      'first',
      () => 'recipe-1'
    );
    expect(created[0].id).toBe('recipe-1');

    const updated = await saveUserRecipe(
      { ...created[0], name: 'Focused' },
      'second'
    );
    expect(updated[0]).toMatchObject({
      id: 'recipe-1',
      name: 'Focused',
      createdAt: 'first',
      updatedAt: 'second',
    });
    await expect(deleteUserRecipe('recipe-1')).resolves.toEqual([]);
  });

  it('merges imported recipes by stable ID', async () => {
    const imported = {
      id: 'shared-1',
      name: 'Shared',
      description: 'From JSON',
      sites: [],
      css: 'body { line-height: 1.5; }',
      createdAt: 'first',
      updatedAt: 'second',
    };
    await importUserRecipes([imported]);
    await expect(getUserRecipes()).resolves.toEqual([imported]);
  });
});
