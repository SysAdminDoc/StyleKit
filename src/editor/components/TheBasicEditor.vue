<template>
  <div class="stylebot-basic-editor">
    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn" @click="layout = !layout">
          <div class="section-header-inner">
            <b-icon icon="bounding-box" class="section-icon" />
            <div class="section-header-text">
              <span class="section-title">{{ t('layout_properties') }}</span>
              <span class="section-hint">Hide, resize, margins, padding</span>
            </div>
            <b-icon :icon="layout ? 'chevron-up' : 'chevron-down'" class="section-chevron" />
          </div>
        </b-btn>
      </b-col>
      <b-collapse v-model="layout" class="collapse-content">
        <b-col cols="12" class="px-2 pt-1">
          <the-layout-properties class="pb-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn" @click="text = !text">
          <div class="section-header-inner">
            <b-icon icon="fonts" class="section-icon" />
            <div class="section-header-text">
              <span class="section-title">{{ t('text_properties') }}</span>
              <span class="section-hint">Font, size, spacing, alignment</span>
            </div>
            <b-icon :icon="text ? 'chevron-up' : 'chevron-down'" class="section-chevron" />
          </div>
        </b-btn>
      </b-col>
      <b-collapse v-model="text" class="collapse-content">
        <b-col cols="12" class="px-2 pt-1">
          <the-text-properties class="pb-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn" @click="colors = !colors">
          <div class="section-header-inner">
            <b-icon icon="droplet" class="section-icon" />
            <div class="section-header-text">
              <span class="section-title">{{ t('color_properties') }}</span>
              <span class="section-hint">Text color, background, shadows</span>
            </div>
            <b-icon :icon="colors ? 'chevron-up' : 'chevron-down'" class="section-chevron" />
          </div>
        </b-btn>
      </b-col>
      <b-collapse v-model="colors" class="collapse-content">
        <b-col cols="12" class="px-2 pt-1">
          <the-color-properties class="pb-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn" @click="border = !border">
          <div class="section-header-inner">
            <b-icon icon="square" class="section-icon" />
            <div class="section-header-text">
              <span class="section-title">{{ t('border_properties') }}</span>
              <span class="section-hint">Lines, thickness, rounded corners</span>
            </div>
            <b-icon :icon="border ? 'chevron-up' : 'chevron-down'" class="section-chevron" />
          </div>
        </b-btn>
      </b-col>
      <b-collapse v-model="border" class="collapse-content">
        <b-col cols="12" class="px-2 pt-1">
          <the-border-properties class="pb-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn" @click="snippets = !snippets">
          <div class="section-header-inner">
            <b-icon icon="lightning" class="section-icon" />
            <div class="section-header-text">
              <span class="section-title">Snippets</span>
              <span class="section-hint">Ready-made styles and effects</span>
            </div>
            <b-icon :icon="snippets ? 'chevron-up' : 'chevron-down'" class="section-chevron" />
          </div>
        </b-btn>
      </b-col>
      <b-collapse v-model="snippets" class="collapse-content">
        <b-col cols="12" class="px-2 pt-1">
          <the-snippet-library class="pb-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn" @click="variables = !variables">
          <div class="section-header-inner">
            <b-icon icon="braces" class="section-icon" />
            <div class="section-header-text">
              <span class="section-title">Variables</span>
              <span class="section-hint">CSS custom properties</span>
            </div>
            <b-icon :icon="variables ? 'chevron-up' : 'chevron-down'" class="section-chevron" />
          </div>
        </b-btn>
      </b-col>
      <b-collapse v-model="variables" class="collapse-content">
        <b-col cols="12" class="px-2 pt-1">
          <the-css-variables class="pb-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn" @click="computedStyles = !computedStyles">
          <div class="section-header-inner">
            <b-icon icon="eye" class="section-icon" />
            <div class="section-header-text">
              <span class="section-title">Computed Styles</span>
              <span class="section-hint">Current element styles</span>
            </div>
            <b-icon :icon="computedStyles ? 'chevron-up' : 'chevron-down'" class="section-chevron" />
          </div>
        </b-btn>
      </b-col>
      <b-collapse v-model="computedStyles" class="collapse-content">
        <b-col cols="12" class="px-2 pt-1">
          <the-computed-styles class="pb-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn" @click="recipes = !recipes">
          <div class="section-header-inner">
            <b-icon icon="star" class="section-icon" />
            <div class="section-header-text">
              <span class="section-title">Site Recipes</span>
              <span class="section-hint">One-click tweaks for popular sites</span>
            </div>
            <b-icon :icon="recipes ? 'chevron-up' : 'chevron-down'" class="section-chevron" />
          </div>
        </b-btn>
      </b-col>
      <b-collapse v-model="recipes" class="collapse-content">
        <b-col cols="12" class="px-2 pt-1">
          <the-site-recipes class="pb-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn" @click="mediaQueries = !mediaQueries">
          <div class="section-header-inner">
            <b-icon icon="aspect-ratio" class="section-icon" />
            <div class="section-header-text">
              <span class="section-title">Media Queries</span>
              <span class="section-hint">Responsive screen-size rules</span>
            </div>
            <b-icon :icon="mediaQueries ? 'chevron-up' : 'chevron-down'" class="section-chevron" />
          </div>
        </b-btn>
      </b-col>
      <b-collapse v-model="mediaQueries" class="collapse-content">
        <b-col cols="12" class="px-2 pt-1">
          <the-media-query-wrapper class="pb-2" />
        </b-col>
      </b-collapse>
    </b-row>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { StylebotBasicModeSections } from '@stylekit/types';

import TheTextProperties from './TheTextProperties.vue';
import TheColorProperties from './TheColorProperties.vue';
import TheLayoutProperties from './TheLayoutProperties.vue';
import TheBorderProperties from './TheBorderProperties.vue';
import TheCssVariables from './TheCssVariables.vue';
import TheComputedStyles from './TheComputedStyles.vue';
import TheSnippetLibrary from './TheSnippetLibrary.vue';
import TheSiteRecipes from './TheSiteRecipes.vue';
import TheMediaQueryWrapper from './TheMediaQueryWrapper.vue';

export default defineComponent({
  name: 'TheBasicEditor',

  components: {
    TheTextProperties,
    TheColorProperties,
    TheLayoutProperties,
    TheBorderProperties,
    TheCssVariables,
    TheComputedStyles,
    TheSnippetLibrary,
    TheSiteRecipes,
    TheMediaQueryWrapper,
  },

  data() {
    return {
      recipes: false,
    };
  },

  computed: {
    text: {
      get(): boolean {
        return this.$store.state.options.basicModeSections.text;
      },
      set(value: boolean) {
        this.set('text', value);
      },
    },
    colors: {
      get(): boolean {
        return this.$store.state.options.basicModeSections.colors;
      },
      set(value: boolean) {
        this.set('colors', value);
      },
    },
    layout: {
      get(): boolean {
        return this.$store.state.options.basicModeSections.layout;
      },
      set(value: boolean) {
        this.set('layout', value);
      },
    },
    border: {
      get(): boolean {
        return this.$store.state.options.basicModeSections.border;
      },
      set(value: boolean) {
        this.set('border', value);
      },
    },
    variables: {
      get(): boolean {
        return this.$store.state.options.basicModeSections.variables;
      },
      set(value: boolean) {
        this.set('variables', value);
      },
    },
    computedStyles: {
      get(): boolean {
        return this.$store.state.options.basicModeSections.computedStyles;
      },
      set(value: boolean) {
        this.set('computedStyles', value);
      },
    },
    snippets: {
      get(): boolean {
        return this.$store.state.options.basicModeSections.snippets;
      },
      set(value: boolean) {
        this.set('snippets', value);
      },
    },
    mediaQueries: {
      get(): boolean {
        return this.$store.state.options.basicModeSections.mediaQueries;
      },
      set(value: boolean) {
        this.set('mediaQueries', value);
      },
    },
  },

  methods: {
    set(name: keyof StylebotBasicModeSections, value: boolean) {
      const sections = this.$store.state.options.basicModeSections;

      this.$store.dispatch('setBasicModeSections', {
        ...sections,
        [name]: value,
      });
    },
  },
});
</script>

<style lang="scss" scoped>
.section {
  border-top: 1px solid #313244;

  &:first-of-type {
    border: none;
  }
}

.collapse-btn {
  background: none !important;
  border-radius: 0 !important;
  border: none !important;
  padding: 7px 10px !important;
  width: 100% !important;
  text-align: left !important;

  &:hover {
    background: rgba(137, 180, 250, 0.06) !important;

    .section-title {
      color: #89b4fa !important;
    }

    .section-icon {
      color: #89b4fa;
    }
  }

  &:focus {
    border: none !important;
    box-shadow: none !important;
  }
}

.section-header-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.section-icon {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  color: #6c7086;
  transition: color 0.15s;
}

.section-header-text {
  flex: 1;
  min-width: 0;
}

.section-title {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #cdd6f4;
  line-height: 1.3;
  transition: color 0.15s;
}

.section-hint {
  display: block;
  font-size: 10px;
  font-weight: 400;
  color: #585b70;
  line-height: 1.3;
  margin-top: 1px;
}

.section-chevron {
  width: 11px;
  height: 11px;
  flex-shrink: 0;
  color: #45475a;
}

.collapse-content {
  width: 100%;
}
</style>
