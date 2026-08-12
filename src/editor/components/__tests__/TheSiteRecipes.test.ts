// @vitest-environment jsdom

import { flushPromises, shallowMount } from '@vue/test-utils';
import TheSiteRecipes from '../TheSiteRecipes.vue';
import {
  addRecipeMarketplaceSource,
  getRecipeMarketplace,
  getUserRecipes,
  saveUserRecipe,
} from '../../utils/chrome';

vi.mock('../../utils/chrome', () => ({
  addRecipeMarketplaceSource: vi.fn(),
  deleteUserRecipe: vi.fn(),
  deleteRecipeMarketplaceSource: vi.fn(),
  getRecipeMarketplace: vi.fn(),
  getUserRecipes: vi.fn(),
  importUserRecipes: vi.fn(),
  refreshRecipeMarketplaceSource: vi.fn(),
  saveUserRecipe: vi.fn(),
}));

vi.mock('../../utils/user-recipes', () => ({
  downloadUserRecipes: vi.fn(),
  pickUserRecipeFile: vi.fn(),
}));

const storedRecipe = {
  id: 'recipe-1',
  name: 'Focused page',
  description: 'Hide distractions',
  sites: ['example.com'],
  css: '.noise { display: none; }',
  createdAt: 'first',
  updatedAt: 'first',
};

const mountRecipes = () =>
  shallowMount(TheSiteRecipes, {
    global: {
      mocks: {
        $store: {
          state: {
            css: 'body { color: red; }',
            url: 'https://www.example.com/page',
          },
          dispatch: vi.fn(),
        },
      },
    },
  });

describe('user-created site recipes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getUserRecipes).mockResolvedValue([storedRecipe]);
    vi.mocked(getRecipeMarketplace).mockResolvedValue([]);
  });

  it('loads user recipes beside the built-in collections', async () => {
    const wrapper = mountRecipes();
    await flushPromises();

    expect(wrapper.text()).toContain('My recipes');
    expect(wrapper.text()).toContain('Focused page');
    expect(wrapper.text()).toContain('example.com');
  });

  it('prefills and saves a reusable recipe from the current page', async () => {
    vi.mocked(saveUserRecipe).mockResolvedValue([storedRecipe]);
    const wrapper = mountRecipes();
    await flushPromises();

    await wrapper.find('.recipe-management-actions button').trigger('click');
    expect(
      (wrapper.get('[aria-label="Recipe sites"]').element as HTMLInputElement)
        .value
    ).toBe('www.example.com');
    expect(
      (wrapper.get('[aria-label="Recipe CSS"]').element as HTMLTextAreaElement)
        .value
    ).toBe('body { color: red; }');
    await wrapper.get('[aria-label="Recipe name"]').setValue('Focused page');
    await wrapper.get('.recipe-form').trigger('submit');
    await flushPromises();

    expect(saveUserRecipe).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Focused page',
        sites: ['www.example.com'],
        css: 'body { color: red; }',
      })
    );
    expect(wrapper.text()).toContain('Recipe saved.');
  });

  it('adds only a pinned GitHub marketplace source', async () => {
    vi.mocked(addRecipeMarketplaceSource).mockResolvedValue([]);
    const wrapper = mountRecipes();
    await flushPromises();

    await wrapper.get('.marketplace-section button').trigger('click');
    await wrapper.get('[aria-label="Marketplace repository"]').setValue(
      'owner/recipes'
    );
    await wrapper.get('[aria-label="Marketplace version pin"]').setValue(
      'v1.2.3'
    );
    await wrapper.get('.marketplace-section form').trigger('submit');
    await flushPromises();

    expect(addRecipeMarketplaceSource).toHaveBeenCalledWith({
      repository: 'owner/recipes',
      ref: 'v1.2.3',
    });
    expect(wrapper.text()).toContain('Pinned marketplace source added.');
  });
});
