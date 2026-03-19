<template>
  <div class="media-query-wrapper">
    <div v-if="!activeSelector" class="mq-empty">
      Select an element first
    </div>

    <template v-else>
      <div class="mq-presets">
        <div class="mq-label">Quick Presets</div>
        <div
          v-for="preset in presets"
          :key="preset.label"
          class="mq-preset-item"
          @click="wrapInMediaQuery(preset.query)"
        >
          <span class="mq-preset-name">{{ preset.label }}</span>
          <span class="mq-preset-query">{{ preset.query }}</span>
        </div>
      </div>

      <div class="mq-custom">
        <div class="mq-label">Custom Media Query</div>
        <div class="mq-custom-row">
          <b-form-input
            v-model="customQuery"
            size="sm"
            class="mq-input"
            placeholder="e.g. (max-width: 768px)"
            autocomplete="off"
          />
          <b-button
            size="sm"
            variant="link"
            class="mq-apply-btn"
            :disabled="!customQuery"
            @click="wrapInMediaQuery(customQuery)"
          >
            Apply
          </b-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import * as postcss from 'postcss';

type MediaQueryPreset = {
  label: string;
  query: string;
};

const PRESETS: MediaQueryPreset[] = [
  { label: 'Mobile', query: '(max-width: 768px)' },
  { label: 'Tablet', query: '(min-width: 769px) and (max-width: 1024px)' },
  { label: 'Desktop', query: '(min-width: 1025px)' },
  { label: 'Dark mode', query: '(prefers-color-scheme: dark)' },
  { label: 'Light mode', query: '(prefers-color-scheme: light)' },
  { label: 'Reduced motion', query: '(prefers-reduced-motion: reduce)' },
  { label: 'Print', query: 'print' },
];

export default defineComponent({
  name: 'TheMediaQueryWrapper',

  data(): { customQuery: string; presets: MediaQueryPreset[] } {
    return {
      customQuery: '',
      presets: PRESETS,
    };
  },

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

    css(): string {
      return this.$store.state.css;
    },
  },

  methods: {
    wrapInMediaQuery(query: string): void {
      if (!this.activeSelector || !query) return;

      try {
        const root = postcss.parse(this.css);
        let selectorRule: postcss.Rule | null = null;

        root.walkRules(rule => {
          if (rule.selector === this.activeSelector && !rule.parent?.type?.toString().includes('atrule')) {
            selectorRule = rule;
          }
        });

        if (!selectorRule) return;

        const ruleClone = (selectorRule as postcss.Rule).clone();
        const mediaRule = postcss.atRule({ name: 'media', params: query });
        mediaRule.append(ruleClone);

        (selectorRule as postcss.Rule).after(mediaRule);
        (selectorRule as postcss.Rule).remove();

        const newCss = root.toString();
        this.$store.dispatch('applyCss', { css: newCss });
      } catch {
        // ignore parse errors
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.media-query-wrapper {
  font-size: 12px;
}

.mq-empty {
  color: #6c7086;
  text-align: center;
  padding: 12px 0;
}

.mq-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  color: #6c7086;
  padding: 4px 0 2px;
  letter-spacing: 0.5px;
}

.mq-presets {
  margin-bottom: 10px;
}

.mq-preset-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s ease;

  &:hover {
    background: rgba(137, 180, 250, 0.1);
  }
}

.mq-preset-name {
  color: #cdd6f4;
  font-size: 12px;
}

.mq-preset-query {
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  color: #6c7086;
  font-size: 10px;
}

.mq-custom-row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 4px;
}

.mq-input {
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px !important;
  flex: 1;
}

.mq-apply-btn {
  font-size: 12px;
  color: #89b4fa;
  text-decoration: none;
  padding: 2px 8px;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    color: #b4d0fb;
  }

  &:disabled {
    color: #585b70;
    cursor: default;
  }
}
</style>
