<template>
  <div class="box-shadow-controls">
    <b-row align-content="center" no-gutters>
      <css-property>{{ t('box_shadow') }}</css-property>

      <css-property-value>
        <b-button
          size="sm"
          :disabled="disabled"
          :variant="hasValue ? 'secondary' : 'outline-secondary'"
          @click="toggle"
        >
          {{ hasValue ? t('box_shadow_reset') : t('box_shadow_apply') }}
        </b-button>
      </css-property-value>
    </b-row>

    <template v-if="hasValue">
      <b-row align-content="center" no-gutters class="mt-1">
        <css-property>X</css-property>
        <css-property-value>
          <b-form-input
            v-model="offsetX"
            size="sm"
            type="number"
            autocomplete="off"
            class="box-shadow-input"
            :disabled="disabled"
          />
        </css-property-value>
      </b-row>

      <b-row align-content="center" no-gutters class="mt-1">
        <css-property>Y</css-property>
        <css-property-value>
          <b-form-input
            v-model="offsetY"
            size="sm"
            type="number"
            autocomplete="off"
            class="box-shadow-input"
            :disabled="disabled"
          />
        </css-property-value>
      </b-row>

      <b-row align-content="center" no-gutters class="mt-1">
        <css-property>{{ t('box_shadow_blur') }}</css-property>
        <css-property-value>
          <b-form-input
            v-model="blur"
            size="sm"
            type="number"
            min="0"
            autocomplete="off"
            class="box-shadow-input"
            :disabled="disabled"
          />
        </css-property-value>
      </b-row>

      <b-row align-content="center" no-gutters class="mt-1">
        <css-property>{{ t('box_shadow_spread') }}</css-property>
        <css-property-value>
          <b-form-input
            v-model="spread"
            size="sm"
            type="number"
            autocomplete="off"
            class="box-shadow-input"
            :disabled="disabled"
          />
        </css-property-value>
      </b-row>

      <b-row align-content="center" no-gutters class="mt-1">
        <css-property>{{ t('border_color') }}</css-property>
        <css-property-value>
          <color-picker :property="'--stylebot-box-shadow-color'" @input="onColorChange" />
        </css-property-value>
      </b-row>
    </template>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { Declaration } from 'postcss';

import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';
import ColorPicker from './ColorPicker.vue';

const DEFAULT_SHADOW = '0px 2px 4px 0px rgba(0, 0, 0, 0.2)';

const parseShadow = (
  value: string
): { x: string; y: string; blur: string; spread: string; color: string } => {
  const defaults = { x: '0', y: '2', blur: '4', spread: '0', color: 'rgba(0, 0, 0, 0.2)' };
  if (!value || value === 'none') return defaults;

  const colorMatch = value.match(
    /(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-z]+)$/
  );
  const color = colorMatch ? colorMatch[1] : defaults.color;
  const withoutColor = colorMatch
    ? value.substring(0, colorMatch.index).trim()
    : value;

  const parts = withoutColor.split(/\s+/);
  return {
    x: parseInt(parts[0], 10).toString() || defaults.x,
    y: parseInt(parts[1], 10).toString() || defaults.y,
    blur: parseInt(parts[2], 10).toString() || defaults.blur,
    spread: parseInt(parts[3], 10).toString() || defaults.spread,
    color,
  };
};

export default Vue.extend({
  name: 'BoxShadow',

  components: {
    CssProperty,
    CssPropertyValue,
    ColorPicker,
  },

  data(): { shadowColor: string } {
    return {
      shadowColor: 'rgba(0, 0, 0, 0.2)',
    };
  },

  computed: {
    rawValue(): string {
      const activeRule = this.$store.getters.activeRule;
      let value = '';

      if (activeRule) {
        activeRule.clone().walkDecls('box-shadow', (decl: Declaration) => {
          value = decl.value;
        });
      }

      return value;
    },

    hasValue(): boolean {
      return !!this.rawValue && this.rawValue !== 'none';
    },

    parsed(): { x: string; y: string; blur: string; spread: string; color: string } {
      return parseShadow(this.rawValue);
    },

    offsetX: {
      get(): string {
        return this.parsed.x;
      },
      set(val: string): void {
        this.applyShadow({ x: val });
      },
    },

    offsetY: {
      get(): string {
        return this.parsed.y;
      },
      set(val: string): void {
        this.applyShadow({ y: val });
      },
    },

    blur: {
      get(): string {
        return this.parsed.blur;
      },
      set(val: string): void {
        this.applyShadow({ blur: val });
      },
    },

    spread: {
      get(): string {
        return this.parsed.spread;
      },
      set(val: string): void {
        this.applyShadow({ spread: val });
      },
    },

    disabled(): boolean {
      return !this.$store.state.activeSelector;
    },
  },

  methods: {
    toggle(): void {
      if (this.hasValue) {
        this.$store.dispatch('applyDeclaration', {
          property: 'box-shadow',
          value: '',
        });
      } else {
        this.$store.dispatch('applyDeclaration', {
          property: 'box-shadow',
          value: DEFAULT_SHADOW,
        });
      }
    },

    applyShadow(overrides: Record<string, string>): void {
      const p = this.parsed;
      const x = overrides.x ?? p.x;
      const y = overrides.y ?? p.y;
      const b = overrides.blur ?? p.blur;
      const s = overrides.spread ?? p.spread;
      const c = overrides.color ?? this.shadowColor || p.color;

      this.$store.dispatch('applyDeclaration', {
        property: 'box-shadow',
        value: `${x}px ${y}px ${b}px ${s}px ${c}`,
      });
    },

    onColorChange(color: string): void {
      this.shadowColor = color;
      this.applyShadow({ color });
    },
  },
});
</script>

<style lang="scss">
.box-shadow-controls {
  .box-shadow-input {
    width: 100% !important;
    max-width: 140px;
  }
}
</style>
