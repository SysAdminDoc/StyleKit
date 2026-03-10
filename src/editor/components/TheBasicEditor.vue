<template>
  <div class="stylebot-basic-editor">
    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn px-3 py-2" @click="layout = !layout">
          {{ t('layout_properties') }}
          <span class="section-hint">Hide, resize, margins, padding</span>
        </b-btn>
      </b-col>

      <b-collapse v-model="layout" class="collapse-content">
        <b-col cols="12" class="px-3 pt-2">
          <the-layout-properties class="pb-4 pt-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn px-3 py-2" @click="text = !text">
          {{ t('text_properties') }}
          <span class="section-hint">Font, size, spacing, alignment</span>
        </b-btn>
      </b-col>

      <b-collapse v-model="text" class="collapse-content">
        <b-col cols="12" class="px-3 pt-2">
          <the-text-properties class="pb-4 pt-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn px-3 py-2" @click="colors = !colors">
          {{ t('color_properties') }}
          <span class="section-hint">Text color, background, shadows</span>
        </b-btn>
      </b-col>

      <b-collapse v-model="colors" class="collapse-content">
        <b-col cols="12" class="px-3 pt-2">
          <the-color-properties class="pb-4 pt-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn px-3 py-2" @click="border = !border">
          {{ t('border_properties') }}
          <span class="section-hint">Lines, thickness, rounded corners</span>
        </b-btn>
      </b-col>

      <b-collapse v-model="border" class="collapse-content">
        <b-col cols="12" class="px-3 pt-2">
          <the-border-properties class="pb-4 pt-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn px-3 py-2" @click="snippets = !snippets">
          Snippets
          <span class="section-hint">Ready-made styles and effects</span>
        </b-btn>
      </b-col>

      <b-collapse v-model="snippets" class="collapse-content">
        <b-col cols="12" class="px-3 pt-2">
          <the-snippet-library class="pb-4 pt-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn px-3 py-2" @click="variables = !variables">
          Variables
          <span class="section-hint">CSS custom properties</span>
        </b-btn>
      </b-col>

      <b-collapse v-model="variables" class="collapse-content">
        <b-col cols="12" class="px-3 pt-2">
          <the-css-variables class="pb-4 pt-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn px-3 py-2" @click="computedStyles = !computedStyles">
          Computed Styles
          <span class="section-hint">Current element styles</span>
        </b-btn>
      </b-col>

      <b-collapse v-model="computedStyles" class="collapse-content">
        <b-col cols="12" class="px-3 pt-2">
          <the-computed-styles class="pb-4 pt-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn px-3 py-2" @click="recipes = !recipes">
          Site Recipes
          <span class="section-hint">One-click tweaks for popular sites</span>
        </b-btn>
      </b-col>

      <b-collapse v-model="recipes" class="collapse-content">
        <b-col cols="12" class="px-3 pt-2">
          <the-site-recipes class="pb-4 pt-2" />
        </b-col>
      </b-collapse>
    </b-row>

    <b-row class="section" no-gutters>
      <b-col cols="12">
        <b-btn class="collapse-btn px-3 py-2" @click="mediaQueries = !mediaQueries">
          Media Queries
          <span class="section-hint">Responsive screen-size rules</span>
        </b-btn>
      </b-col>

      <b-collapse v-model="mediaQueries" class="collapse-content">
        <b-col cols="12" class="px-3 pt-2">
          <the-media-query-wrapper class="pb-4 pt-2" />
        </b-col>
      </b-collapse>
    </b-row>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Declaration } from 'postcss';
import { StylebotBasicModeSections } from '@stylebot/types';

import TheTextProperties from './TheTextProperties.vue';
import TheColorProperties from './TheColorProperties.vue';
import TheLayoutProperties from './TheLayoutProperties.vue';
import TheBorderProperties from './TheBorderProperties.vue';
import TheCssVariables from './TheCssVariables.vue';
import TheComputedStyles from './TheComputedStyles.vue';
import TheSnippetLibrary from './TheSnippetLibrary.vue';
import TheSiteRecipes from './TheSiteRecipes.vue';
import TheMediaQueryWrapper from './TheMediaQueryWrapper.vue';

const SECTION_PROPERTIES: Partial<Record<keyof StylebotBasicModeSections, string[]>> = {
  layout: [
    'display', 'visibility', 'width', 'height', 'min-width', 'max-width',
    'min-height', 'max-height', 'margin-top', 'margin-right', 'margin-bottom',
    'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  ],
  text: [
    'font-family', 'font-size', 'font-weight', 'font-style', 'font-variant',
    'text-decoration', 'text-transform', 'text-align', 'letter-spacing',
    'word-spacing', 'line-height',
  ],
  colors: ['color', 'background-color', 'background', 'opacity', 'box-shadow'],
  border: [
    'border-style', 'border-color', 'border-width', 'border-radius',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  ],
};

export default Vue.extend({
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
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

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

  watch: {
    activeSelector(val: string) {
      this.autoExpandSections(val);
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

    autoExpandSections(selector: string): void {
      const sections = this.$store.state.options.basicModeSections;
      const rule = this.$store.getters.activeRule;
      const updates: Partial<StylebotBasicModeSections> = {};

      (Object.keys(SECTION_PROPERTIES) as Array<keyof typeof SECTION_PROPERTIES>).forEach(section => {
        let hasValue = false;
        if (rule && selector) {
          const props = SECTION_PROPERTIES[section] || [];
          rule.clone().walkDecls((decl: Declaration) => {
            if (props.includes(decl.prop)) hasValue = true;
          });
        }
        updates[section] = hasValue;
      });

      this.$store.dispatch('setBasicModeSections', {
        ...sections,
        ...updates,
        variables: false,
        computedStyles: false,
        snippets: false,
        mediaQueries: false,
      });
      this.recipes = false;
    },
  },
});
</script>

<style lang="scss" scoped>
.section {
  border-top: 1px solid #45475a;

  &:first-of-type {
    border: none;
    margin-top: 0;
  }
}

.collapse-btn {
  background: none !important;
  border-radius: 0 !important;
  border: none !important;
  color: #cdd6f4 !important;
  padding: 0 !important;
  width: 100% !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  text-align: left !important;

  &:hover {
    color: #89b4fa !important;
  }

  &:focus {
    border: none !important;
    box-shadow: none !important;
  }
}

.section-hint {
  display: block;
  font-size: 11px !important;
  font-weight: 400 !important;
  color: #6c7086 !important;
  margin-top: 1px;
}

.collapse-content {
  width: 100%;
}
</style>
