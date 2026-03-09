<template>
  <div v-if="parts.length > 0" class="selector-builder">
    <span
      v-for="part in parts"
      :key="part.value"
      class="selector-chip"
      :class="{ active: part.active }"
      @click="togglePart(part)"
    >
      {{ part.label }}
    </span>

    <span
      class="scope-toggle"
      :class="{ active: highlightingScope }"
      :title="highlightingScope ? 'Hide scope highlights' : 'Highlight all matches'"
      @click="toggleScope"
    >
      {{ matchCount }} match{{ matchCount !== 1 ? 'es' : '' }}
    </span>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { validateSelector } from '@stylebot/css';
import { Highlighter } from '@stylebot/highlighter';

type SelectorPart = {
  type: 'tag' | 'id' | 'class';
  value: string;
  label: string;
  active: boolean;
};

export default Vue.extend({
  name: 'TheSelectorBuilder',

  data(): { parts: SelectorPart[]; highlightingScope: boolean; scopeHighlighter: Highlighter | null } {
    return {
      parts: [],
      highlightingScope: false,
      scopeHighlighter: null,
    };
  },

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

    matchCount(): number {
      if (!this.activeSelector || !validateSelector(this.activeSelector)) {
        return 0;
      }
      try {
        return document.querySelectorAll(this.activeSelector).length;
      } catch {
        return 0;
      }
    },
  },

  watch: {
    activeSelector: {
      immediate: true,
      handler(selector: string) {
        this.parseSelectorParts(selector);
        if (this.highlightingScope) {
          this.showScopeHighlight();
        }
      },
    },
  },

  beforeDestroy() {
    this.clearScopeHighlight();
  },

  methods: {
    parseSelectorParts(selector: string): void {
      if (!selector || !validateSelector(selector)) {
        this.parts = [];
        return;
      }

      try {
        const el = document.querySelector(selector) as HTMLElement | null;
        if (!el) {
          this.parts = [];
          return;
        }

        const parts: SelectorPart[] = [];
        const tag = el.tagName.toLowerCase();

        parts.push({
          type: 'tag',
          value: tag,
          label: tag,
          active: selector.includes(tag),
        });

        const id = el.getAttribute('id');
        if (id) {
          parts.push({
            type: 'id',
            value: `#${id}`,
            label: `#${id}`,
            active: selector.includes(`#${id}`),
          });
        }

        const classAttr = el.getAttribute('class')?.trim();
        if (classAttr) {
          const classes = classAttr.replace(/\s{2,}/g, ' ').split(' ');
          for (const cls of classes) {
            if (cls) {
              parts.push({
                type: 'class',
                value: `.${cls}`,
                label: `.${cls}`,
                active: selector.includes(`.${cls}`),
              });
            }
          }
        }

        this.parts = parts;
      } catch {
        this.parts = [];
      }
    },

    togglePart(part: SelectorPart): void {
      part.active = !part.active;
      this.rebuildSelector();
    },

    rebuildSelector(): void {
      const activeParts = this.parts.filter(p => p.active);
      if (activeParts.length === 0) {
        return;
      }

      let selector = '';
      const hasTag = activeParts.some(p => p.type === 'tag');
      const hasId = activeParts.some(p => p.type === 'id');

      if (hasTag) {
        selector += activeParts.find(p => p.type === 'tag')!.value;
      }

      if (hasId) {
        selector += activeParts.find(p => p.type === 'id')!.value;
      }

      for (const part of activeParts) {
        if (part.type === 'class') {
          selector += part.value;
        }
      }

      if (selector) {
        this.$store.commit('setActiveSelector', selector);
      }
    },

    toggleScope(): void {
      this.highlightingScope = !this.highlightingScope;
      if (this.highlightingScope) {
        this.showScopeHighlight();
      } else {
        this.clearScopeHighlight();
      }
    },

    showScopeHighlight(): void {
      if (!this.scopeHighlighter) {
        this.scopeHighlighter = new Highlighter({ onSelect: () => {} });
      }
      if (this.activeSelector && validateSelector(this.activeSelector)) {
        this.scopeHighlighter.highlight(this.activeSelector);
      }
    },

    clearScopeHighlight(): void {
      this.scopeHighlighter?.unhighlight();
      this.scopeHighlighter = null;
      this.highlightingScope = false;
    },
  },
});
</script>

<style lang="scss" scoped>
.selector-builder {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 4px 8px 6px;
}

.selector-chip {
  display: inline-block;
  font-size: 11px;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  user-select: none;
  transition: all 0.15s ease;
  background: rgba(255, 255, 255, 0.08);
  color: #999;
  border: 1px solid rgba(255, 255, 255, 0.1);

  &.active {
    background: rgba(137, 180, 250, 0.15);
    color: #89b4fa;
    border-color: rgba(137, 180, 250, 0.3);
  }

  &:hover {
    background: rgba(137, 180, 250, 0.1);
  }
}

.scope-toggle {
  font-size: 10px;
  color: #6c7086;
  margin-left: auto;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.15s ease;
  user-select: none;

  &:hover {
    background: rgba(137, 180, 250, 0.1);
    color: #89b4fa;
  }

  &.active {
    background: rgba(166, 227, 161, 0.15);
    color: #a6e3a1;
  }
}
</style>
