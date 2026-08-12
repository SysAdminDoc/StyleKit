import { parse } from 'postcss';
import type {
  UserRecipe,
  UserRecipeDraft,
  UserRecipeExportEnvelope,
} from '@stylekit/types';

export const MAX_USER_RECIPES = 100;
const MAX_RECIPE_NAME = 80;
const MAX_RECIPE_DESCRIPTION = 240;
const MAX_RECIPE_SITES = 20;
const MAX_RECIPE_CSS = 500_000;
const RECIPE_ID_PATTERN = /^[a-zA-Z0-9._-]{1,100}$/;

export const normalizeRecipeSite = (value: string): string => {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    return url.hostname.replace(/^\*\./, '');
  } catch {
    return '';
  }
};

export const normalizeUserRecipeDraft = (
  value: UserRecipeDraft
): UserRecipeDraft => {
  const name = value.name.trim().slice(0, MAX_RECIPE_NAME);
  const description = value.description
    .trim()
    .slice(0, MAX_RECIPE_DESCRIPTION);
  const css = value.css.trim();
  const sites = Array.from(
    new Set(value.sites.map(normalizeRecipeSite).filter(Boolean))
  ).slice(0, MAX_RECIPE_SITES);

  if (!name) throw new Error('Recipe name is required');
  if (!css) throw new Error('Recipe CSS is required');
  if (css.length > MAX_RECIPE_CSS) {
    throw new Error('Recipe CSS exceeds the 500 KB limit');
  }
  parse(css);

  return {
    id:
      value.id && RECIPE_ID_PATTERN.test(value.id) ? value.id : undefined,
    name,
    description,
    sites,
    css,
  };
};

export const normalizeStoredUserRecipe = (
  value: unknown,
  fallbackTimestamp = new Date().toISOString()
): UserRecipe => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Recipe must be an object');
  }
  const record = value as Record<string, unknown>;
  const draft = normalizeUserRecipeDraft({
    id: typeof record.id === 'string' ? record.id : undefined,
    name: typeof record.name === 'string' ? record.name : '',
    description:
      typeof record.description === 'string' ? record.description : '',
    sites: Array.isArray(record.sites)
      ? record.sites.filter((site): site is string => typeof site === 'string')
      : [],
    css: typeof record.css === 'string' ? record.css : '',
  });

  if (!draft.id) throw new Error('Recipe ID is invalid');
  return {
    ...draft,
    id: draft.id,
    createdAt:
      typeof record.createdAt === 'string'
        ? record.createdAt
        : fallbackTimestamp,
    updatedAt:
      typeof record.updatedAt === 'string'
        ? record.updatedAt
        : fallbackTimestamp,
  };
};

export const createUserRecipeExport = (
  recipes: UserRecipe[]
): UserRecipeExportEnvelope => ({
  version: 1,
  app: 'StyleKit',
  kind: 'recipes',
  exportedAt: new Date().toISOString(),
  recipes: recipes.map(recipe => normalizeStoredUserRecipe(recipe)),
});

export const parseUserRecipeExport = (
  value: unknown
): UserRecipeExportEnvelope => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid recipe export');
  }
  const record = value as Record<string, unknown>;
  if (
    record.version !== 1 ||
    record.app !== 'StyleKit' ||
    record.kind !== 'recipes' ||
    !Array.isArray(record.recipes)
  ) {
    throw new Error('Unsupported StyleKit recipe export');
  }
  if (record.recipes.length > MAX_USER_RECIPES) {
    throw new Error(`Recipe export exceeds ${MAX_USER_RECIPES} items`);
  }

  return {
    version: 1,
    app: 'StyleKit',
    kind: 'recipes',
    exportedAt:
      typeof record.exportedAt === 'string'
        ? record.exportedAt
        : new Date().toISOString(),
    recipes: record.recipes.map(recipe => normalizeStoredUserRecipe(recipe)),
  };
};

export const recipeMatchesUrl = (
  recipe: Pick<UserRecipe, 'sites'>,
  currentUrl: string
): boolean => {
  if (recipe.sites.length === 0) return true;
  const site = normalizeRecipeSite(currentUrl);
  return recipe.sites.some(
    candidate => site === candidate || site.endsWith(`.${candidate}`)
  );
};
