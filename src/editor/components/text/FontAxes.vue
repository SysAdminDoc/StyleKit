<template>
  <div class="font-axes">
    <div class="font-axis-row">
      <label for="stylekit-font-weight">Font weight</label>
      <input
        id="stylekit-font-weight"
        v-model.number="weight"
        type="range"
        :min="weightAxis.min"
        :max="weightAxis.max"
        :step="axisStep(weightAxis)"
        :disabled="disabled"
        @input="applyWeight"
      />
      <input
        v-model.number="weight"
        type="number"
        class="font-axis-number"
        aria-label="Font weight value"
        :min="weightAxis.min"
        :max="weightAxis.max"
        :step="axisStep(weightAxis)"
        :disabled="disabled"
        @input="applyWeight"
      />
    </div>

    <div v-if="variableFont" class="variable-font-heading">
      <span>{{ variableFont.family }} axes</span>
      <button type="button" :disabled="disabled" @click="resetAxes">
        Reset axes
      </button>
    </div>

    <div v-for="axis in variationAxes" :key="axis.tag" class="font-axis-row">
      <label :for="`stylekit-font-axis-${axis.tag}`">
        {{ axisName(axis.tag) }}
        <code>{{ axis.tag }}</code>
      </label>
      <input
        :id="`stylekit-font-axis-${axis.tag}`"
        v-model.number="axisValues[axis.tag]"
        type="range"
        :min="axis.min"
        :max="axis.max"
        :step="axisStep(axis)"
        :disabled="disabled"
        @input="applyAxes"
      />
      <input
        v-model.number="axisValues[axis.tag]"
        type="number"
        class="font-axis-number"
        :aria-label="`${axisName(axis.tag)} axis value`"
        :min="axis.min"
        :max="axis.max"
        :step="axisStep(axis)"
        :disabled="disabled"
        @input="applyAxes"
      />
    </div>

    <div v-if="activeSelector && !variableFont" class="font-axis-hint">
      Variable axes appear when the selected element uses a variable Google
      Font.
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { GoogleFontAxis } from '@stylekit/types';
import { getGoogleFontsCache } from '../../utils/chrome';
import {
  buildVariationSettings,
  findFontAxes,
  getAxisStep,
  parseVariationSettings,
} from '../../utils/font-axes';

const AXIS_NAMES: Record<string, string> = {
  GRAD: 'Grade',
  ital: 'Italic',
  opsz: 'Optical size',
  slnt: 'Slant',
  wdth: 'Width',
  wght: 'Weight',
};

const DEFAULT_WEIGHT_AXIS: GoogleFontAxis = {
  tag: 'wght',
  min: 1,
  max: 1000,
  defaultValue: 400,
};

export default defineComponent({
  name: 'FontAxes',

  data(): {
    catalogAxes: Record<string, GoogleFontAxis[]>;
    axisValues: Record<string, number>;
    weight: number;
  } {
    return {
      catalogAxes: {},
      axisValues: {},
      weight: 400,
    };
  },

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

    css(): string {
      return this.$store.state.css;
    },

    disabled(): boolean {
      return !this.activeSelector;
    },

    selectedElement(): HTMLElement | null {
      if (!this.activeSelector) return null;
      try {
        return document.querySelector<HTMLElement>(this.activeSelector);
      } catch {
        return null;
      }
    },

    computedStyle(): CSSStyleDeclaration | null {
      void this.css;
      return this.selectedElement
        ? window.getComputedStyle(this.selectedElement)
        : null;
    },

    variableFont(): { family: string; axes: GoogleFontAxis[] } | null {
      return findFontAxes(
        this.computedStyle?.fontFamily || '',
        this.catalogAxes
      );
    },

    weightAxis(): GoogleFontAxis {
      return (
        this.variableFont?.axes.find(axis => axis.tag === 'wght') ||
        DEFAULT_WEIGHT_AXIS
      );
    },

    variationAxes(): GoogleFontAxis[] {
      return (this.variableFont?.axes || []).filter(
        axis => axis.tag !== 'wght'
      );
    },
  },

  watch: {
    activeSelector(): void {
      this.syncValues();
    },
    css(): void {
      this.syncValues();
    },
    catalogAxes(): void {
      this.syncValues();
    },
  },

  async created() {
    const cache = await getGoogleFontsCache().catch(() => null);
    if (cache?.axes) this.catalogAxes = cache.axes;
    this.syncValues();
  },

  methods: {
    axisName(tag: string): string {
      return AXIS_NAMES[tag] || 'Custom axis';
    },

    axisStep(axis: GoogleFontAxis): number {
      return getAxisStep(axis);
    },

    syncValues(): void {
      const style = this.computedStyle;
      if (!style) return;
      const parsedWeight = Number(style.fontWeight);
      this.weight = Number.isFinite(parsedWeight)
        ? parsedWeight
        : this.weightAxis.defaultValue;
      const current = parseVariationSettings(style.fontVariationSettings || '');
      const values = { ...current };
      this.variationAxes.forEach(axis => {
        values[axis.tag] = current[axis.tag] ?? axis.defaultValue;
      });
      this.axisValues = values;
    },

    applyWeight(): void {
      this.$store.dispatch('applyDeclaration', {
        property: 'font-weight',
        value: String(this.weight),
      });
    },

    applyAxes(): void {
      const values = { ...this.axisValues };
      this.variationAxes.forEach(axis => {
        values[axis.tag] ??= axis.defaultValue;
      });
      this.$store.dispatch('applyDeclaration', {
        property: 'font-variation-settings',
        value: buildVariationSettings(values),
      });
    },

    resetAxes(): void {
      this.axisValues = Object.fromEntries(
        this.variationAxes.map(axis => [axis.tag, axis.defaultValue])
      );
      this.$store.dispatch('applyDeclaration', {
        property: 'font-variation-settings',
        value: '',
      });
    },
  },
});
</script>

<style lang="scss" scoped>
.font-axes {
  margin-top: 8px;
}

.font-axis-row {
  display: grid;
  grid-template-columns: minmax(92px, 1fr) minmax(80px, 1.4fr) 53px;
  align-items: center;
  gap: 5px;
  margin-bottom: 5px;

  label {
    min-width: 0;
    color: #a6adc8;
    font-size: 10px;
  }

  code {
    color: #6c7086;
    font-size: 8px;
  }

  input[type='range'] {
    min-width: 0;
    accent-color: #89b4fa;
  }
}

.font-axis-number {
  width: 53px;
  height: 24px;
  padding: 2px 4px;
  color: #cdd6f4;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 3px;
  font-size: 10px;
}

.variable-font-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 5px;
  color: #cba6f7;
  font-size: 10px;
  font-weight: 600;

  button {
    padding: 2px 6px;
    color: #89b4fa;
    background: transparent;
    border: 1px solid #45475a;
    border-radius: 3px;
    font-size: 9px;
  }
}

.font-axis-hint {
  color: #6c7086;
  font-size: 9px;
  line-height: 1.3;
}
</style>
