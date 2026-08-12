import {
  createUserRecipeExport,
  normalizeRecipeSite,
  normalizeUserRecipeDraft,
  parseUserRecipeExport,
  recipeMatchesUrl,
} from '../user-recipes';

const recipe = {
  id: 'recipe-1',
  name: 'Clean feed',
  description: 'Hide noisy cards',
  sites: ['example.com'],
  css: '.noise { display: none; }',
  createdAt: '2026-08-12T10:00:00.000Z',
  updatedAt: '2026-08-12T10:00:00.000Z',
};

describe('user recipe contracts', () => {
  it('normalizes site inputs and matches subdomains', () => {
    expect(normalizeRecipeSite('https://WWW.Example.com/path')).toBe(
      'www.example.com'
    );
    expect(recipeMatchesUrl(recipe, 'https://docs.example.com/page')).toBe(
      true
    );
    expect(recipeMatchesUrl(recipe, 'https://unrelated.test')).toBe(false);
  });

  it('validates CSS and bounds user-authored fields', () => {
    expect(
      normalizeUserRecipeDraft({
        name: '  Focus  ',
        description: '  Calm page  ',
        sites: ['Example.com', 'example.com'],
        css: ' body { color: red; } ',
      })
    ).toEqual({
      id: undefined,
      name: 'Focus',
      description: 'Calm page',
      sites: ['example.com'],
      css: 'body { color: red; }',
    });
    expect(() =>
      normalizeUserRecipeDraft({
        name: 'Broken',
        description: '',
        sites: [],
        css: 'body {',
      })
    ).toThrow();
  });

  it('round-trips the versioned JSON recipe envelope', () => {
    const exported = createUserRecipeExport([recipe]);
    const parsed = parseUserRecipeExport(JSON.parse(JSON.stringify(exported)));
    expect(parsed.recipes).toEqual([recipe]);
    expect(() => parseUserRecipeExport({ version: 2, recipes: [] })).toThrow(
      'Unsupported StyleKit recipe export'
    );
  });
});
