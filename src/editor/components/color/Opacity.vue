<template>
  <b-row align-content="center" no-gutters>
    <css-property>{{ t('opacity') }}</css-property>

    <css-property-value>
      <b-input-group class="opacity-input-group">
        <b-form-input
          v-model="opacity"
          size="sm"
          type="number"
          min="0"
          max="100"
          step="5"
          autocomplete="off"
          :disabled="disabled"
          @focus="focus"
        />

        <template #append>
          <b-input-group-text class="opacity-unit">%</b-input-group-text>
        </template>
      </b-input-group>
    </css-property-value>
  </b-row>
</template>

<script lang="ts">
import Vue from 'vue';
import { Declaration } from 'postcss';

import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';

export default Vue.extend({
  name: 'Opacity',

  components: {
    CssProperty,
    CssPropertyValue,
  },

  computed: {
    opacity: {
      get(): string {
        const activeRule = this.$store.getters.activeRule;
        let value = '';

        if (activeRule) {
          activeRule.clone().walkDecls('opacity', (decl: Declaration) => {
            value = decl.value;
          });
        }

        if (!value) {
          return '';
        }

        return `${Math.round(parseFloat(value) * 100)}`;
      },

      set(percent: string): void {
        let value = '';
        if (percent) {
          const num = parseInt(percent, 10);
          if (num >= 0 && num <= 100) {
            value = `${num / 100}`;
          }
        }

        this.$store.dispatch('applyDeclaration', {
          property: 'opacity',
          value,
        });
      },
    },

    disabled(): boolean {
      return !this.$store.state.activeSelector;
    },
  },

  methods: {
    focus(event: FocusEvent): void {
      (event.target as HTMLInputElement).select();
    },
  },
});
</script>

<style lang="scss">
.opacity-input-group {
  width: 100% !important;
  max-width: 140px;

  .opacity-unit {
    font-size: 12px !important;
    padding: 0 6px !important;
    background: transparent !important;
    border-color: #ced4da !important;
  }
}
</style>
