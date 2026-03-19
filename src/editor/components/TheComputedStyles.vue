<template>
  <div class="computed-styles">
    <div v-if="!activeSelector" class="computed-empty">
      Select an element to view computed styles
    </div>

    <template v-else>
      <div
        v-for="group in styleGroups"
        :key="group.label"
        class="computed-group"
      >
        <div class="computed-group-label">{{ group.label }}</div>
        <div
          v-for="prop in group.props"
          :key="prop.name"
          class="computed-row"
          @click="applyProperty(prop.name, prop.value)"
        >
          <span class="computed-prop">{{ prop.name }}</span>
          <span class="computed-value" :title="prop.value">{{ prop.value }}</span>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

type ComputedProp = { name: string; value: string };
type StyleGroup = { label: string; props: ComputedProp[] };

const STYLE_GROUPS: Array<{ label: string; properties: string[] }> = [
  {
    label: 'Text',
    properties: [
      'font-family',
      'font-size',
      'font-weight',
      'font-style',
      'line-height',
      'letter-spacing',
      'text-align',
      'text-decoration',
      'text-transform',
      'color',
    ],
  },
  {
    label: 'Background',
    properties: [
      'background-color',
      'background-image',
      'background-size',
      'background-position',
    ],
  },
  {
    label: 'Box Model',
    properties: [
      'width',
      'height',
      'margin',
      'padding',
      'border',
      'border-radius',
      'box-sizing',
    ],
  },
  {
    label: 'Layout',
    properties: [
      'display',
      'position',
      'top',
      'right',
      'bottom',
      'left',
      'z-index',
      'float',
      'flex-direction',
      'justify-content',
      'align-items',
      'gap',
      'overflow',
    ],
  },
  {
    label: 'Effects',
    properties: [
      'opacity',
      'visibility',
      'box-shadow',
      'text-shadow',
      'filter',
      'transform',
      'transition',
    ],
  },
];

export default defineComponent({
  name: 'TheComputedStyles',

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

    styleGroups(): StyleGroup[] {
      if (!this.activeSelector) return [];

      try {
        const el = document.querySelector(this.activeSelector) as HTMLElement | null;
        if (!el) return [];

        const computed = window.getComputedStyle(el);
        const groups: StyleGroup[] = [];

        for (const group of STYLE_GROUPS) {
          const props: ComputedProp[] = [];
          for (const prop of group.properties) {
            const value = computed.getPropertyValue(prop);
            if (value) {
              props.push({ name: prop, value });
            }
          }
          if (props.length > 0) {
            groups.push({ label: group.label, props });
          }
        }

        return groups;
      } catch {
        return [];
      }
    },
  },

  methods: {
    applyProperty(property: string, value: string): void {
      this.$store.dispatch('applyDeclaration', { property, value });
    },
  },
});
</script>

<style lang="scss" scoped>
.computed-styles {
  font-size: 12px;
}

.computed-empty {
  color: #6c7086;
  font-size: 12px;
  text-align: center;
  padding: 12px 0;
}

.computed-group {
  margin-bottom: 8px;
}

.computed-group-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6c7086;
  padding: 4px 0 2px;
  letter-spacing: 0.5px;
}

.computed-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 1px 0;
  cursor: pointer;
  border-radius: 3px;

  &:hover {
    background: rgba(137, 180, 250, 0.08);
  }
}

.computed-prop {
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  color: #cba6f7;
  font-size: 11px;
  flex-shrink: 0;
}

.computed-value {
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  color: #a6adc8;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
