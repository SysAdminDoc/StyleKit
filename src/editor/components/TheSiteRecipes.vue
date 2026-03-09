<template>
  <div class="site-recipes">
    <div v-if="matchingRecipes.length > 0" class="recipe-section">
      <div class="recipe-section-title">For this site</div>
      <div
        v-for="recipe in matchingRecipes"
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
import Vue from 'vue';

interface Recipe {
  name: string;
  description: string;
  sites: string[];
  css: string;
}

const siteRecipes: Recipe[] = [
  // YouTube
  {
    name: 'Clean YouTube',
    description: 'Hide comments, sidebar recommendations, and end screens',
    sites: ['youtube.com'],
    css: '#comments { display: none; }\n#related { display: none; }\n.ytp-ce-element { display: none; }\n.ytp-cards-button { display: none; }',
  },
  {
    name: 'YouTube Focus Mode',
    description: 'Just the video - hide everything else',
    sites: ['youtube.com'],
    css: '#masthead-container { display: none; }\n#related { display: none; }\n#comments { display: none; }\n#info { display: none; }\n#meta { display: none; }\n#secondary { display: none; }',
  },
  {
    name: 'YouTube Dark Sidebar',
    description: 'Darken the sidebar and guide',
    sites: ['youtube.com'],
    css: 'ytd-mini-guide-renderer { background: #0f0f0f; }\nytd-guide-renderer { background: #0f0f0f; }',
  },
  // Reddit
  {
    name: 'Clean Reddit',
    description: 'Hide sidebar, promoted posts, and awards',
    sites: ['reddit.com'],
    css: '[data-testid="frontpage-sidebar"] { display: none; }\n[data-testid="post-container"] shreddit-post[is-promoted] { display: none; }\n.award-button { display: none; }',
  },
  {
    name: 'Reddit Wide Mode',
    description: 'Make content full width',
    sites: ['reddit.com'],
    css: '.ListingLayout-outerContainer { max-width: 100%; }\n.ListingLayout-backgroundContainer { max-width: 100%; }',
  },
  // Twitter/X
  {
    name: 'Clean Twitter/X',
    description: 'Hide trending sidebar, who to follow, and promoted tweets',
    sites: ['twitter.com', 'x.com'],
    css: '[data-testid="sidebarColumn"] { display: none; }\n[data-testid="placementTracking"] { display: none; }',
  },
  {
    name: 'Twitter/X Focus',
    description: 'Maximize timeline width',
    sites: ['twitter.com', 'x.com'],
    css: '[data-testid="sidebarColumn"] { display: none; }\n[data-testid="primaryColumn"] { max-width: 100%; }',
  },
  // GitHub
  {
    name: 'GitHub Wide Code',
    description: 'Make code and file views full width',
    sites: ['github.com'],
    css: '.container-xl { max-width: 100%; }\n.js-repo-pjax-container .container-xl { padding-left: 16px; padding-right: 16px; }',
  },
  // Google
  {
    name: 'Google Clean Search',
    description: 'Hide ads and sidebar from Google search results',
    sites: ['google.com'],
    css: '#tads { display: none; }\n#tadsb { display: none; }\n#rhs { display: none; }\n.commercial-unit-desktop-top { display: none; }',
  },
  // Amazon
  {
    name: 'Amazon Clean',
    description: 'Hide sponsored products and ad placements',
    sites: ['amazon.com'],
    css: '.AdHolder { display: none; }\n[data-cel-widget*="sponsored"] { display: none; }\n.s-sponsored-label-info-icon { display: none; }',
  },
  // Wikipedia
  {
    name: 'Wikipedia Reader',
    description: 'Wider content, larger text, cleaner layout',
    sites: ['wikipedia.org'],
    css: '#mw-content-text { font-size: 18px; line-height: 1.7; }\n.mw-body { max-width: 900px; margin: 0 auto; }',
  },
  // Facebook
  {
    name: 'Facebook Clean',
    description: 'Hide sponsored posts and right sidebar',
    sites: ['facebook.com'],
    css: '[data-pagelet="RightRail"] { display: none; }\n[aria-label="Sponsored"] { display: none; }',
  },
];

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

export default Vue.extend({
  name: 'TheSiteRecipes',

  data() {
    return {
      previewStyle: null as HTMLStyleElement | null,
    };
  },

  computed: {
    currentUrl(): string {
      return this.$store.state.url || '';
    },

    matchingRecipes(): Recipe[] {
      const url = this.currentUrl.toLowerCase();
      return siteRecipes.filter(recipe =>
        recipe.sites.some(site => url.includes(site))
      );
    },

    universalRecipes(): Recipe[] {
      return universalRecipes;
    },
  },

  methods: {
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

  beforeDestroy() {
    this.removePreview();
  },
});
</script>

<style lang="scss" scoped>
.site-recipes {
  font-size: 13px;
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
