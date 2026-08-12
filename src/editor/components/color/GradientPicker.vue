<template>
  <b-row align-content="center" no-gutters>
    <css-property>{{ t('gradient') }}</css-property>

    <css-property-value>
      <div class="gradient-picker">
        <div
          class="gradient-preview"
          :style="{ background: previewGradient }"
          aria-label="Gradient preview"
        />

        <div class="gradient-controls">
          <select
            v-model="gradientType"
            class="gradient-select"
            aria-label="Gradient type"
            :disabled="disabled"
            @change="apply"
          >
            <option value="linear">Linear</option>
            <option value="radial">Radial</option>
            <option value="conic">Conic</option>
          </select>

          <select
            v-if="gradientType === 'radial'"
            v-model="radialShape"
            class="gradient-select"
            aria-label="Radial gradient shape"
            :disabled="disabled"
            @change="apply"
          >
            <option value="circle">Circle</option>
            <option value="ellipse">Ellipse</option>
          </select>
        </div>

        <div v-if="gradientType !== 'radial'" class="gradient-angle-controls">
          <label for="gradient-angle-range">
            {{ gradientType === 'conic' ? 'Start angle' : 'Angle' }}
          </label>
          <input
            id="gradient-angle-range"
            v-model.number="angle"
            type="range"
            class="gradient-angle-range"
            min="0"
            max="359"
            :disabled="disabled"
            @input="apply"
          />
          <input
            v-model.number="angle"
            type="number"
            class="gradient-angle"
            aria-label="Gradient angle in degrees"
            :disabled="disabled"
            @input="apply"
          />
          <span class="gradient-unit">deg</span>
        </div>

        <div v-if="gradientType !== 'radial'" class="gradient-angle-presets">
          <button
            v-for="preset in anglePresets"
            :key="preset"
            type="button"
            class="gradient-angle-preset"
            :class="{ active: normalizedAngle === preset }"
            :aria-label="`Set gradient angle to ${preset} degrees`"
            :disabled="disabled"
            @click="setAngle(preset)"
          >
            {{ preset }}°
          </button>
        </div>

        <div v-if="gradientType !== 'linear'" class="gradient-center-controls">
          <label>
            Center X
            <input
              v-model.number="centerX"
              type="range"
              min="0"
              max="100"
              :disabled="disabled"
              @input="apply"
            />
            <span>{{ centerX }}%</span>
          </label>
          <label>
            Center Y
            <input
              v-model.number="centerY"
              type="range"
              min="0"
              max="100"
              :disabled="disabled"
              @input="apply"
            />
            <span>{{ centerY }}%</span>
          </label>
        </div>

        <div class="gradient-stops">
          <div v-for="(stop, i) in stops" :key="i" class="gradient-stop-row">
            <input
              v-model="stop.color"
              type="color"
              class="gradient-stop-color"
              :disabled="disabled"
              @input="apply"
            />
            <input
              v-model.number="stop.position"
              type="range"
              class="gradient-stop-pos"
              min="0"
              max="100"
              :disabled="disabled"
              @input="apply"
            />
            <span class="gradient-stop-pct">{{ stop.position }}%</span>
            <button
              v-if="stops.length > 2"
              type="button"
              class="gradient-stop-remove"
              :aria-label="`Remove gradient stop ${i + 1}`"
              :disabled="disabled"
              @click="removeStop(i)"
            >
              &times;
            </button>
          </div>
        </div>

        <button
          type="button"
          class="gradient-add-stop"
          :disabled="disabled"
          @click="addStop"
        >
          + Add Stop
        </button>

        <button type="button" class="gradient-copy" @click="copyCss">
          Copy CSS
        </button>

        <button
          v-if="hasGradient"
          type="button"
          class="gradient-clear"
          :disabled="disabled"
          @click="clear"
        >
          Clear
        </button>

        <span
          v-if="copyStatus"
          class="gradient-copy-status"
          role="status"
          aria-live="polite"
        >
          {{ copyStatus }}
        </span>
      </div>
    </css-property-value>
  </b-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Declaration } from 'postcss';
import {
  buildGradient,
  buildGradientDeclaration,
  normalizeGradientAngle,
  type GradientConfig,
  type GradientType,
  type RadialGradientShape,
} from '../../utils/gradient';

import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';

export default defineComponent({
  name: 'GradientPicker',

  components: {
    CssProperty,
    CssPropertyValue,
  },

  data(): {
    gradientType: GradientType;
    angle: number;
    radialShape: RadialGradientShape;
    centerX: number;
    centerY: number;
    stops: Array<{ color: string; position: number }>;
    anglePresets: number[];
    copyStatus: string;
  } {
    return {
      gradientType: 'linear',
      angle: 180,
      radialShape: 'circle',
      centerX: 50,
      centerY: 50,
      stops: [
        { color: '#89b4fa', position: 0 },
        { color: '#cba6f7', position: 100 },
      ] as Array<{ color: string; position: number }>,
      anglePresets: [0, 45, 90, 135, 180, 225, 270, 315],
      copyStatus: '',
    };
  },

  computed: {
    disabled(): boolean {
      return !this.$store.state.activeSelector;
    },

    hasGradient(): boolean {
      const activeRule = this.$store.getters.activeRule;
      if (!activeRule) return false;
      let value = '';
      activeRule.clone().walkDecls('background-image', (decl: Declaration) => {
        value = decl.value;
      });
      return value.includes('gradient');
    },

    previewGradient(): string {
      return this.buildGradient();
    },

    normalizedAngle(): number {
      return normalizeGradientAngle(this.angle);
    },
  },

  methods: {
    buildGradient(): string {
      return buildGradient(this.gradientConfig());
    },

    gradientConfig(): GradientConfig {
      return {
        type: this.gradientType,
        angle: this.angle,
        radialShape: this.radialShape,
        centerX: this.centerX,
        centerY: this.centerY,
        stops: this.stops,
      };
    },

    apply(): void {
      this.$store.dispatch('applyDeclaration', {
        property: 'background-image',
        value: this.buildGradient(),
      });
    },

    clear(): void {
      this.$store.dispatch('applyDeclaration', {
        property: 'background-image',
        value: '',
      });
    },

    setAngle(angle: number): void {
      this.angle = angle;
      this.apply();
    },

    async copyCss(): Promise<void> {
      const css = buildGradientDeclaration(this.gradientConfig());
      try {
        await navigator.clipboard.writeText(css);
        this.copyStatus = 'Copied CSS';
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = css;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const copied =
          typeof document.execCommand === 'function' &&
          document.execCommand('copy');
        textarea.remove();
        this.copyStatus = copied ? 'Copied CSS' : 'Copy failed';
      }
      window.setTimeout(() => {
        this.copyStatus = '';
      }, 2000);
    },

    addStop(): void {
      const lastPos = this.stops[this.stops.length - 1]?.position || 0;
      this.stops.push({
        color: '#a6e3a1',
        position: Math.min(100, lastPos + 25),
      });
      this.apply();
    },

    removeStop(index: number): void {
      this.stops.splice(index, 1);
      this.apply();
    },
  },
});
</script>

<style lang="scss" scoped>
.gradient-picker {
  width: 100%;
}

.gradient-preview {
  height: 24px;
  border-radius: 4px;
  border: 1px solid #45475a;
  margin-bottom: 6px;
}

.gradient-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}

.gradient-angle-controls {
  display: grid;
  grid-template-columns: auto minmax(55px, 1fr) 48px auto;
  align-items: center;
  gap: 4px;
  margin-bottom: 5px;

  label {
    color: #a6adc8;
    font-size: 10px;
  }
}

.gradient-angle-range {
  min-width: 55px;
  accent-color: #89b4fa;
}

.gradient-angle-presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
  margin-bottom: 6px;
}

.gradient-angle-preset {
  padding: 2px 0;
  color: #a6adc8;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 3px;
  font-size: 9px;
  cursor: pointer;

  &.active,
  &:hover {
    color: #1e1e2e;
    background: #89b4fa;
    border-color: #89b4fa;
  }
}

.gradient-center-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 6px;

  label {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    color: #a6adc8;
    font-size: 10px;
  }

  input {
    grid-column: 1 / -1;
    width: 100%;
    accent-color: #89b4fa;
  }
}

.gradient-select {
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 3px;
  color: #cdd6f4;
  font-size: 11px;
  padding: 2px 4px;
  outline: none;
}

.gradient-angle {
  width: 48px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 3px;
  color: #cdd6f4;
  font-size: 11px;
  padding: 2px 4px;
  outline: none;
  text-align: center;
}

.gradient-unit {
  font-size: 10px;
  color: #6c7086;
}

.gradient-stops {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 6px;
}

.gradient-stop-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.gradient-stop-color {
  width: 24px;
  height: 20px;
  border: 1px solid #45475a;
  border-radius: 3px;
  padding: 0;
  cursor: pointer;
  background: transparent;
}

.gradient-stop-pos {
  flex: 1;
  height: 4px;
  accent-color: #89b4fa;
}

.gradient-stop-pct {
  font-size: 10px;
  color: #6c7086;
  width: 28px;
  text-align: right;
}

.gradient-stop-remove {
  background: none;
  border: none;
  color: #f38ba8;
  font-size: 14px;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
}

.gradient-add-stop,
.gradient-copy,
.gradient-clear {
  background: none;
  border: 1px solid #45475a;
  border-radius: 3px;
  color: #89b4fa;
  font-size: 10px;
  padding: 2px 8px;
  cursor: pointer;
  margin-right: 4px;

  &:hover {
    background: rgba(137, 180, 250, 0.1);
    border-color: #89b4fa;
  }

  &:disabled {
    color: #585b70;
    cursor: default;
  }
}

.gradient-copy-status {
  display: inline-block;
  margin-left: 4px;
  color: #a6e3a1;
  font-size: 10px;
}

.gradient-clear {
  color: #f38ba8;
  border-color: rgba(243, 139, 168, 0.3);

  &:hover {
    background: rgba(243, 139, 168, 0.1);
    border-color: #f38ba8;
  }
}
</style>
