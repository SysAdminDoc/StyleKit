import type { UserRecipe, UserRecipeDraft } from '@stylekit/types';
import {
  MAX_USER_RECIPES,
  normalizeStoredUserRecipe,
  normalizeUserRecipeDraft,
} from '../utils/user-recipes';

const STORAGE_KEY = 'stylekit-user-recipes';
let mutationQueue: Promise<void> = Promise.resolve();

const readRecipes = async (): Promise<UserRecipe[]> => {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (!Array.isArray(stored[STORAGE_KEY])) return [];

  return stored[STORAGE_KEY]
    .slice(0, MAX_USER_RECIPES)
    .flatMap((value: unknown) => {
      try {
        return [normalizeStoredUserRecipe(value)];
      } catch {
        return [];
      }
    });
};

const writeRecipes = async (recipes: UserRecipe[]): Promise<UserRecipe[]> => {
  const bounded = recipes
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MAX_USER_RECIPES);
  await chrome.storage.local.set({ [STORAGE_KEY]: bounded });
  return bounded;
};

const mutateRecipes = <T>(
  operation: () => Promise<T>
): Promise<T> => {
  const result = mutationQueue.then(operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
};

export const getUserRecipes = async (): Promise<UserRecipe[]> => {
  await mutationQueue;
  return readRecipes();
};

export const saveUserRecipe = (
  input: UserRecipeDraft,
  now = new Date().toISOString(),
  createId: () => string = () => crypto.randomUUID()
): Promise<UserRecipe[]> =>
  mutateRecipes(async () => {
    const draft = normalizeUserRecipeDraft(input);
    const recipes = await readRecipes();
    const existing = draft.id
      ? recipes.find(recipe => recipe.id === draft.id)
      : undefined;
    const recipe: UserRecipe = {
      ...draft,
      id: existing?.id || draft.id || createId(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };
    return writeRecipes([
      recipe,
      ...recipes.filter(candidate => candidate.id !== recipe.id),
    ]);
  });

export const deleteUserRecipe = (id: string): Promise<UserRecipe[]> =>
  mutateRecipes(async () => {
    const recipes = await readRecipes();
    return writeRecipes(recipes.filter(recipe => recipe.id !== id));
  });

export const importUserRecipes = (
  incoming: UserRecipe[]
): Promise<UserRecipe[]> =>
  mutateRecipes(async () => {
    if (incoming.length > MAX_USER_RECIPES) {
      throw new Error(`Recipe import exceeds ${MAX_USER_RECIPES} items`);
    }
    const recipes = await readRecipes();
    const merged = new Map(recipes.map(recipe => [recipe.id, recipe]));
    incoming.forEach(value => {
      const recipe = normalizeStoredUserRecipe(value);
      merged.set(recipe.id, recipe);
    });
    return writeRecipes([...merged.values()]);
  });

export const USER_RECIPES_STORAGE_KEY = STORAGE_KEY;

export const resetUserRecipesForTests = (): void => {
  mutationQueue = Promise.resolve();
};
