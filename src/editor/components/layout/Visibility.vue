<template>
  <b-row align-content="center" no-gutters>
    <css-property>{{ t('visibility') }}</css-property>

    <css-property-value>
      <b-button
        size="sm"
        :disabled="disabled"
        :variant="isHidden ? 'secondary' : 'outline-secondary'"
        @click="toggle"
      >
        {{ t('hide') }}
      </b-button>

      <b-button
        size="sm"
        class="ml-2"
        :disabled="disabled"
        variant="outline-secondary"
        @click="clearLayout"
      >
        Clear
      </b-button>
    </css-property-value>
  </b-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Declaration } from 'postcss';
import { addDeclaration } from '@stylekit/css';

import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';

export default defineComponent({
  name: 'Visibility',

  components: {
    CssProperty,
    CssPropertyValue,
  },

  computed: {
    isHidden(): boolean {
      const activeRule = this.$store.getters.activeRule;
      let value = '';

      if (activeRule) {
        activeRule.clone().walkDecls('display', (decl: Declaration) => {
          value = decl.value;
        });
      }

      return value === 'none';
    },

    disabled(): boolean {
      return !this.$store.state.activeSelector;
    },
  },

  methods: {
    toggle(): void {
      let value = this.isHidden ? '' : 'none';

      this.$store.dispatch('applyDeclaration', {
        property: 'display',
        value,
      });
    },

    clearLayout(): void {
      const properties = [
        'display',
        'width',
        'height',
        'margin-top',
        'margin-right',
        'margin-bottom',
        'margin-left',
        'padding-top',
        'padding-right',
        'padding-bottom',
        'padding-left',
        'border-top-width',
        'border-right-width',
        'border-bottom-width',
        'border-left-width',
      ];

      const selector = this.$store.state.activeSelector;
      if (!selector) return;

      let css = this.$store.state.css;
      for (const property of properties) {
        css = addDeclaration(property, '', selector, css);
      }
      this.$store.dispatch('applyCss', { css });
    },
  },
});
</script>
