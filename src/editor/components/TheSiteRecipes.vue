<template>
  <div class="site-recipes">
    <div
      v-if="siteSuggestion"
      class="site-suggestion"
      role="region"
      :aria-label="`Suggested recipe for ${siteSuggestion.siteName}`"
    >
      <div class="site-suggestion-copy">
        <strong>
          You're on {{ siteSuggestion.siteName }} — try
          {{ siteSuggestion.recipe.name }}
        </strong>
        <span>{{ siteSuggestion.recipe.description }}</span>
      </div>
      <b-button
        size="sm"
        variant="primary"
        @mouseenter="previewRecipe(siteSuggestion.recipe)"
        @mouseleave="removePreview"
        @click="installRecipe(siteSuggestion.recipe)"
      >
        Apply suggestion
      </b-button>
    </div>

    <div class="recipe-section">
      <div class="recipe-section-heading">
        <div class="recipe-section-title">My recipes</div>
        <div class="recipe-management-actions">
          <button type="button" @click="startCreate">New</button>
          <button type="button" @click="importRecipes">Import</button>
          <button
            type="button"
            :disabled="userRecipes.length === 0"
            @click="exportRecipes(userRecipes)"
          >
            Export all
          </button>
        </div>
      </div>

      <div v-if="recipeError" class="recipe-error" role="alert">
        {{ recipeError }}
      </div>
      <div v-if="recipeStatus" class="recipe-status" role="status">
        {{ recipeStatus }}
      </div>

      <form v-if="editingRecipe" class="recipe-form" @submit.prevent="saveRecipe">
        <label>
          Name
          <input v-model="recipeDraft.name" aria-label="Recipe name" />
        </label>
        <label>
          Description
          <input
            v-model="recipeDraft.description"
            aria-label="Recipe description"
          />
        </label>
        <label>
          Sites (comma separated; blank is universal)
          <input v-model="recipeSites" aria-label="Recipe sites" />
        </label>
        <label>
          CSS
          <textarea
            v-model="recipeDraft.css"
            rows="6"
            aria-label="Recipe CSS"
          />
        </label>
        <div class="recipe-form-actions">
          <button type="submit" :disabled="savingRecipe">
            {{ savingRecipe ? 'Saving...' : 'Save recipe' }}
          </button>
          <button type="button" @click="cancelEdit">Cancel</button>
        </div>
      </form>

      <div v-if="!loadingRecipes && userRecipes.length === 0" class="no-match-hint">
        Save the current page CSS as a reusable recipe, or import a shared
        StyleKit recipe JSON file.
      </div>

      <div
        v-for="recipe in userRecipes"
        :key="recipe.id"
        class="recipe-item user-recipe-item"
      >
        <div class="recipe-header">
          <span class="recipe-name">{{ recipe.name }}</span>
          <span class="recipe-desc">{{ recipe.description }}</span>
          <span class="recipe-sites">
            {{ recipe.sites.length ? recipe.sites.join(', ') : 'Universal' }}
          </span>
        </div>
        <div class="recipe-actions user-recipe-actions">
          <button
            type="button"
            @mouseenter="previewRecipe(recipe)"
            @mouseleave="removePreview"
            @click="installRecipe(recipe)"
          >
            Apply
          </button>
          <button type="button" @click="startEdit(recipe)">Edit</button>
          <button type="button" @click="exportRecipes([recipe])">Export</button>
          <button
            type="button"
            :aria-label="
              deleteConfirmId === recipe.id
                ? `Confirm delete ${recipe.name}`
                : `Delete ${recipe.name}`
            "
            @click="removeUserRecipe(recipe)"
          >
            {{ deleteConfirmId === recipe.id ? 'Sure?' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <div class="recipe-section marketplace-section">
      <div class="recipe-section-heading">
        <div class="recipe-section-title">Recipe marketplace</div>
        <div class="recipe-management-actions">
          <button type="button" @click="addingMarketplaceSource = true">
            Add source
          </button>
        </div>
      </div>
      <div class="no-match-hint marketplace-hint">
        Public GitHub repositories must provide
        <code>stylekit-recipes.json</code> at a pinned release tag or commit.
      </div>

      <form
        v-if="addingMarketplaceSource"
        class="recipe-form"
        @submit.prevent="addMarketplaceSource"
      >
        <label>
          GitHub repository (owner/repo)
          <input
            v-model="marketplaceDraft.repository"
            aria-label="Marketplace repository"
            placeholder="owner/stylekit-recipes"
          />
        </label>
        <label>
          Version pin
          <input
            v-model="marketplaceDraft.ref"
            aria-label="Marketplace version pin"
            placeholder="v1.0.0 or 40-character commit SHA"
          />
        </label>
        <div class="recipe-form-actions">
          <button type="submit" :disabled="loadingMarketplace">
            {{ loadingMarketplace ? 'Fetching...' : 'Add pinned source' }}
          </button>
          <button type="button" @click="addingMarketplaceSource = false">
            Cancel
          </button>
        </div>
      </form>

      <div
        v-for="source in marketplaceSources"
        :key="source.id"
        class="marketplace-source"
      >
        <div class="marketplace-source-header">
          <div>
            <span class="recipe-name">{{ source.repository }}</span>
            <span class="recipe-sites">Pinned to {{ source.ref }}</span>
          </div>
          <div class="recipe-management-actions">
            <button type="button" @click="refreshMarketplaceSource(source.id)">
              Refresh
            </button>
            <button type="button" @click="removeMarketplaceSource(source.id)">
              Remove
            </button>
          </div>
        </div>
        <div
          v-for="recipe in source.recipes"
          :key="`${source.id}:${recipe.id}`"
          class="recipe-item marketplace-recipe-item"
        >
          <div class="recipe-header">
            <span class="recipe-name">{{ recipe.name }}</span>
            <span class="recipe-desc">{{ recipe.description }}</span>
          </div>
          <div class="recipe-actions user-recipe-actions">
            <button
              type="button"
              @mouseenter="previewRecipe(recipe)"
              @mouseleave="removePreview"
              @click="installMarketplaceRecipe(recipe)"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="additionalSiteRecipes.length > 0" class="recipe-section">
      <div class="recipe-section-title">
        More for {{ siteSuggestion?.siteName || 'this site' }}
      </div>
      <div
        v-for="recipe in additionalSiteRecipes"
        :key="recipe.name"
        class="recipe-item"
      >
        <div class="recipe-header">
          <span class="recipe-name">{{ recipe.name }}</span>
          <span class="recipe-desc">{{ recipe.description }}</span>
        </div>
        <div class="recipe-actions">
          <b-button
            size="sm"
            variant="outline-secondary"
            @mouseenter="previewRecipe(recipe)"
            @mouseleave="removePreview"
            @click="installRecipe(recipe)"
          >
            Apply
          </b-button>
        </div>
      </div>
    </div>

    <div class="recipe-section">
      <div class="recipe-section-title">Universal</div>
      <div
        v-for="recipe in universalRecipes"
        :key="recipe.name"
        class="recipe-item"
      >
        <div class="recipe-header">
          <span class="recipe-name">{{ recipe.name }}</span>
          <span class="recipe-desc">{{ recipe.description }}</span>
        </div>
        <div class="recipe-actions">
          <b-button
            size="sm"
            variant="outline-secondary"
            @mouseenter="previewRecipe(recipe)"
            @mouseleave="removePreview"
            @click="installRecipe(recipe)"
          >
            Apply
          </b-button>
        </div>
      </div>
    </div>

    <div v-if="matchingRecipes.length === 0" class="no-match-hint">
      No site-specific recipes for this page. Try the universal ones above, or use Snippets for individual elements.
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type {
  RecipeMarketplaceSource,
  RecipeMarketplaceSourceDraft,
  UserRecipe,
  UserRecipeDraft,
} from '@stylekit/types';
import {
  addRecipeMarketplaceSource,
  deleteUserRecipe,
  deleteRecipeMarketplaceSource,
  getRecipeMarketplace,
  getUserRecipes,
  importUserRecipes,
  refreshRecipeMarketplaceSource,
  saveUserRecipe,
} from '../utils/chrome';
import {
  downloadUserRecipes,
  pickUserRecipeFile,
} from '../utils/user-recipes';
import { normalizeRecipeSite } from '../../utils/user-recipes';
import {
  findSiteRecipes,
  getSiteRecipeSuggestion,
  type SiteRecipe as Recipe,
  type SiteRecipeSuggestion,
} from '../utils/site-recipes';

const universalRecipes: Recipe[] = [
  {
    name: 'Dark Mode',
    description: 'Force dark background with light text on any page',
    sites: [],
    css: 'html { filter: invert(1) hue-rotate(180deg); }\nimg, video, [style*="background-image"] { filter: invert(1) hue-rotate(180deg); }',
  },
  {
    name: 'Larger Text',
    description: 'Increase all text size by 20%',
    sites: [],
    css: 'body { font-size: 120% !important; }',
  },
  {
    name: 'Maximum Readability',
    description: 'Wider line spacing, comfortable reading width, larger font',
    sites: [],
    css: 'body { font-size: 18px; line-height: 1.8; }\narticle, main, .content, .post, .entry-content, [role="main"] { max-width: 720px; margin-left: auto; margin-right: auto; }',
  },
  {
    name: 'Hide All Images',
    description: 'Remove all images from the page',
    sites: [],
    css: 'img, picture, [role="img"], svg:not([class*="icon"]) { display: none; }',
  },
  {
    name: 'Hide Fixed Headers',
    description: 'Stop sticky navbars from following you',
    sites: [],
    css: 'header, nav, [class*="header"], [class*="navbar"], [class*="sticky"] { position: relative !important; }',
  },
  {
    name: 'Remove Animations',
    description: 'Disable all transitions and animations for a calmer experience',
    sites: [],
    css: '*, *::before, *::after { animation: none !important; transition: none !important; }',
  },
  {
    name: 'High Contrast',
    description: 'Increase contrast for better visibility',
    sites: [],
    css: 'html { filter: contrast(1.4); }',
  },
  {
    name: 'Remove Rounded Corners',
    description: 'Make everything square and sharp',
    sites: [],
    css: '* { border-radius: 0 !important; }',
  },
];

export default defineComponent({
  name: 'TheSiteRecipes',

  data(): {
    previewStyle: HTMLStyleElement | null;
    userRecipes: UserRecipe[];
    loadingRecipes: boolean;
    savingRecipe: boolean;
    editingRecipe: boolean;
    recipeDraft: UserRecipeDraft;
    recipeSites: string;
    recipeError: string;
    recipeStatus: string;
    deleteConfirmId: string | null;
    marketplaceSources: RecipeMarketplaceSource[];
    marketplaceDraft: RecipeMarketplaceSourceDraft;
    addingMarketplaceSource: boolean;
    loadingMarketplace: boolean;
  } {
    return {
      previewStyle: null,
      userRecipes: [],
      loadingRecipes: true,
      savingRecipe: false,
      editingRecipe: false,
      recipeDraft: {
        name: '',
        description: '',
        sites: [],
        css: '',
      },
      recipeSites: '',
      recipeError: '',
      recipeStatus: '',
      deleteConfirmId: null,
      marketplaceSources: [],
      marketplaceDraft: { repository: '', ref: '' },
      addingMarketplaceSource: false,
      loadingMarketplace: false,
    };
  },

  computed: {
    currentUrl(): string {
      return this.$store.state.url || '';
    },

    matchingRecipes(): Recipe[] {
      return findSiteRecipes(this.currentUrl);
    },

    siteSuggestion(): SiteRecipeSuggestion | null {
      return getSiteRecipeSuggestion(this.currentUrl);
    },

    additionalSiteRecipes(): Recipe[] {
      return this.matchingRecipes.slice(1);
    },

    universalRecipes(): Recipe[] {
      return universalRecipes;
    },
  },

  created() {
    void this.loadUserRecipes();
    void this.loadMarketplace();
  },

  beforeUnmount() {
    this.removePreview();
  },

  methods: {
    async loadMarketplace(): Promise<void> {
      this.loadingMarketplace = true;
      try {
        this.marketplaceSources = await getRecipeMarketplace();
      } catch (error) {
        this.recipeError =
          error instanceof Error
            ? error.message
            : 'Recipe marketplace could not be loaded';
      } finally {
        this.loadingMarketplace = false;
      }
    },

    async addMarketplaceSource(): Promise<void> {
      this.loadingMarketplace = true;
      this.recipeError = '';
      try {
        this.marketplaceSources = await addRecipeMarketplaceSource(
          this.marketplaceDraft
        );
        this.marketplaceDraft = { repository: '', ref: '' };
        this.addingMarketplaceSource = false;
        this.recipeStatus = 'Pinned marketplace source added.';
      } catch (error) {
        this.recipeError =
          error instanceof Error ? error.message : 'Marketplace source failed';
      } finally {
        this.loadingMarketplace = false;
      }
    },

    async refreshMarketplaceSource(id: string): Promise<void> {
      this.loadingMarketplace = true;
      this.recipeError = '';
      try {
        this.marketplaceSources = await refreshRecipeMarketplaceSource(id);
        this.recipeStatus = 'Marketplace source refreshed at its pinned version.';
      } catch (error) {
        this.recipeError =
          error instanceof Error ? error.message : 'Marketplace refresh failed';
      } finally {
        this.loadingMarketplace = false;
      }
    },

    async removeMarketplaceSource(id: string): Promise<void> {
      this.recipeError = '';
      try {
        this.marketplaceSources = await deleteRecipeMarketplaceSource(id);
        this.recipeStatus = 'Marketplace source removed.';
      } catch (error) {
        this.recipeError =
          error instanceof Error ? error.message : 'Marketplace removal failed';
      }
    },

    async installMarketplaceRecipe(recipe: UserRecipe): Promise<void> {
      this.recipeError = '';
      try {
        this.userRecipes = await saveUserRecipe({
          name: recipe.name,
          description: recipe.description,
          sites: recipe.sites,
          css: recipe.css,
        });
        this.recipeStatus = `${recipe.name} installed to My recipes.`;
      } catch (error) {
        this.recipeError =
          error instanceof Error ? error.message : 'Recipe install failed';
      }
    },

    async loadUserRecipes(): Promise<void> {
      this.loadingRecipes = true;
      this.recipeError = '';
      try {
        this.userRecipes = await getUserRecipes();
      } catch (error) {
        this.recipeError =
          error instanceof Error ? error.message : 'Recipes could not be loaded';
      } finally {
        this.loadingRecipes = false;
      }
    },

    startCreate(): void {
      const site = normalizeRecipeSite(this.currentUrl);
      this.recipeDraft = {
        name: '',
        description: '',
        sites: site ? [site] : [],
        css: this.$store.state.css || '',
      };
      this.recipeSites = site;
      this.recipeError = '';
      this.recipeStatus = '';
      this.editingRecipe = true;
    },

    startEdit(recipe: UserRecipe): void {
      this.recipeDraft = {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        sites: [...recipe.sites],
        css: recipe.css,
      };
      this.recipeSites = recipe.sites.join(', ');
      this.recipeError = '';
      this.recipeStatus = '';
      this.editingRecipe = true;
    },

    cancelEdit(): void {
      this.editingRecipe = false;
      this.savingRecipe = false;
    },

    async saveRecipe(): Promise<void> {
      this.savingRecipe = true;
      this.recipeError = '';
      try {
        this.userRecipes = await saveUserRecipe({
          ...this.recipeDraft,
          sites: this.recipeSites.split(','),
        });
        this.editingRecipe = false;
        this.recipeStatus = 'Recipe saved.';
      } catch (error) {
        this.recipeError =
          error instanceof Error ? error.message : 'Recipe could not be saved';
      } finally {
        this.savingRecipe = false;
      }
    },

    async removeUserRecipe(recipe: UserRecipe): Promise<void> {
      if (this.deleteConfirmId !== recipe.id) {
        this.deleteConfirmId = recipe.id;
        return;
      }
      this.recipeError = '';
      try {
        this.userRecipes = await deleteUserRecipe(recipe.id);
        this.recipeStatus = 'Recipe deleted.';
      } catch (error) {
        this.recipeError =
          error instanceof Error ? error.message : 'Recipe could not be deleted';
      } finally {
        this.deleteConfirmId = null;
      }
    },

    exportRecipes(recipes: UserRecipe[]): void {
      const filename =
        recipes.length === 1
          ? `stylekit-recipe-${recipes[0].id}.json`
          : 'stylekit-recipes.json';
      downloadUserRecipes(recipes, filename);
      this.recipeStatus = `${recipes.length} recipe${recipes.length === 1 ? '' : 's'} exported.`;
    },

    async importRecipes(): Promise<void> {
      this.recipeError = '';
      try {
        const recipes = await pickUserRecipeFile();
        this.userRecipes = await importUserRecipes(recipes);
        this.recipeStatus = `${recipes.length} recipe${recipes.length === 1 ? '' : 's'} imported.`;
      } catch (error) {
        this.recipeError =
          error instanceof Error ? error.message : 'Recipe import failed';
      }
    },

    installRecipe(recipe: Recipe): void {
      const currentCss = this.$store.state.css || '';
      const newCss = currentCss
        ? currentCss.trim() + '\n\n' + recipe.css
        : recipe.css;

      this.$store.dispatch('applyCss', { css: newCss });
      this.removePreview();
    },

    previewRecipe(recipe: Recipe): void {
      this.removePreview();
      const style = document.createElement('style');
      style.id = 'stylebot-recipe-preview';
      style.textContent = recipe.css;
      document.documentElement.appendChild(style);
      this.previewStyle = style;
    },

    removePreview(): void {
      if (this.previewStyle) {
        this.previewStyle.remove();
        this.previewStyle = null;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.site-recipes {
  font-size: 13px;
}

.site-suggestion {
  align-items: center;
  background: rgba(137, 180, 250, 0.12);
  border: 1px solid rgba(137, 180, 250, 0.45);
  border-radius: 6px;
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin-bottom: 12px;
  padding: 9px;
}

.site-suggestion-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;

  span {
    color: #a6adc8;
    font-size: 11px;
  }
}

.recipe-section {
  margin-bottom: 12px;
}

.recipe-section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #6c7086;
  margin-bottom: 6px;
  font-weight: 600;
}

.recipe-section-heading {
  align-items: center;
  display: flex;
  justify-content: space-between;
}

.recipe-management-actions,
.recipe-form-actions,
.user-recipe-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.marketplace-hint {
  margin-bottom: 6px;
}

.marketplace-source {
  border-left: 2px solid #89b4fa;
  margin: 7px 0;
  padding-left: 7px;
}

.marketplace-source-header {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
}

.marketplace-recipe-item {
  padding-left: 4px;
}

.recipe-management-actions button,
.recipe-form-actions button,
.user-recipe-actions button {
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 3px;
  color: #cdd6f4;
  cursor: pointer;
  font-size: 10px;
  padding: 2px 5px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}

.recipe-form {
  background: #181825;
  border: 1px solid #45475a;
  border-radius: 5px;
  display: grid;
  gap: 6px;
  margin: 6px 0;
  padding: 8px;

  label {
    color: #a6adc8;
    display: grid;
    font-size: 10px;
    gap: 2px;
  }

  input,
  textarea {
    background: #11111b;
    border: 1px solid #45475a;
    border-radius: 3px;
    color: #cdd6f4;
    font: inherit;
    padding: 4px;
    resize: vertical;
  }
}

.recipe-error,
.recipe-status {
  border-radius: 3px;
  font-size: 11px;
  margin: 4px 0;
  padding: 4px 6px;
}

.recipe-error {
  background: rgba(243, 139, 168, 0.12);
  color: #f38ba8;
}

.recipe-status {
  background: rgba(166, 227, 161, 0.12);
  color: #a6e3a1;
}

.recipe-sites {
  color: #89b4fa;
  display: block;
  font-size: 10px;
  margin-top: 2px;
}

.user-recipe-item {
  align-items: flex-start;
}

.user-recipe-actions {
  justify-content: flex-end;
  max-width: 124px;
}

.recipe-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid #313244;

  &:last-child {
    border-bottom: none;
  }
}

.recipe-header {
  flex: 1;
  min-width: 0;
}

.recipe-name {
  display: block;
  color: #cdd6f4;
  font-weight: 500;
  font-size: 13px;
}

.recipe-desc {
  display: block;
  color: #6c7086;
  font-size: 11px;
  margin-top: 1px;
}

.recipe-actions {
  flex-shrink: 0;
  margin-left: 8px;
}

.no-match-hint {
  color: #6c7086;
  font-size: 12px;
  font-style: italic;
  margin-top: 4px;
}
</style>
