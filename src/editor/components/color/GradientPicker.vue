<template>
  <b-row align-content="center" no-gutters>
    <css-property>{{ t('gradient') }}</css-property>

    <css-property-value>
      <div class="gradient-picker">
        <div class="gradient-preview" :style="{ background: previewGradient }" />

        <div class="gradient-controls">
          <select v-model="gradientType" class="gradient-select" :disabled="disabled" @change="apply">
            <option value="linear">Linear</option>
            <option value="radial">Radial</option>
          </select>

          <input
            v-if="gradientType === 'linear'"
            v-model="angle"
            type="number"
            class="gradient-angle"
            min="0"
            max="360"
            :disabled="disabled"
            @input="apply"
          />
          <span v-if="gradientType === 'linear'" class="gradient-unit">deg</span>
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
              class="gradient-stop-remove"
              :disabled="disabled"
              @click="removeStop(i)"
            >&times;</button>
          </div>
        </div>

        <button class="gradient-add-stop" :disabled="disabled" @click="addStop">+ Add Stop</button>

        <button
          v-if="hasGradient"
          class="gradient-clear"
          :disabled="disabled"
          @click="clear"
        >Clear</button>
      </div>
    </css-property-value>
  </b-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { Declaration } from 'postcss';

import CssProperty from '../CssProperty.vue';
import CssPropertyValue from '../CssPropertyValue.vue';

export default defineComponent({
  name: 'GradientPicker',

  components: {
    CssProperty,
    CssPropertyValue,
  },

  data() {
    return {
      gradientType: 'linear' as 'linear' | 'radial',
      angle: 180,
      stops: [
        { color: '#89b4fa', position: 0 },
        { color: '#cba6f7', position: 100 },
      ] as Array<{ color: string; position: number }>,
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
  },

  methods: {
    buildGradient(): string {
      const sortedStops = [...this.stops]
        .sort((a, b) => a.position - b.position)
        .map(s => `${s.color} ${s.position}%`)
        .join(', ');

      if (this.gradientType === 'radial') {
        return `radial-gradient(circle, ${sortedStops})`;
      }
      return `linear-gradient(${this.angle}deg, ${sortedStops})`;
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

.gradient-clear {
  color: #f38ba8;
  border-color: rgba(243, 139, 168, 0.3);

  &:hover {
    background: rgba(243, 139, 168, 0.1);
    border-color: #f38ba8;
  }
}
</style>
