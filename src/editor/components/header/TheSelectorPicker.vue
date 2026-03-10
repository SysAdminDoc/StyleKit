<template>
  <dropdown-hack-to-support-shadow-dom>
    <b-dropdown
      right
      size="sm"
      variant="outline-secondary"
      :disabled="!activeSelector"
      class="selector-picker-dropdown"
      no-caret
      @show="onShow"
      @hide="onHide"
    >
      <template #button-content>
        <b-icon icon="list-ul" aria-hidden="true" />
      </template>

      <b-dropdown-text class="picker-heading">Selector alternatives</b-dropdown-text>
      <b-dropdown-divider />

      <div
        v-for="s in candidates"
        :key="s"
        class="picker-item"
        :class="{ 'picker-item-active': s === activeSelector }"
        @click="applySelector(s)"
        @mouseenter="highlightSelector(s)"
        @mouseleave="clearHighlight"
      >
        {{ s }}
      </div>

      <b-dropdown-text v-if="candidates.length === 0" class="picker-empty">
        No element matched
      </b-dropdown-text>
    </b-dropdown>
  </dropdown-hack-to-support-shadow-dom>
</template>

<script lang="ts">
import Vue from 'vue';
import { validateSelector } from '@stylebot/css';
import { Highlighter } from '@stylebot/highlighter';
import DropdownHackToSupportShadowDom from './../DropdownHackToSupportShadowDom.vue';

export default Vue.extend({
  name: 'TheSelectorPicker',

  components: { DropdownHackToSupportShadowDom },

  data(): { candidates: string[]; highlighter: Highlighter | null } {
    return {
      candidates: [],
      highlighter: null,
    };
  },

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },
  },

  created() {
    this.highlighter = new Highlighter({ onSelect: () => {} });
  },

  beforeDestroy() {
    this.highlighter?.unhighlight();
  },

  methods: {
    onShow() {
      this.candidates = this.generateCandidates(this.activeSelector);
    },

    onHide() {
      this.highlighter?.unhighlight();
    },

    applySelector(selector: string) {
      this.highlighter?.unhighlight();
      this.$store.commit('setActiveSelector', selector);
    },

    highlightSelector(selector: string) {
      if (validateSelector(selector)) {
        this.highlighter?.highlight(selector);
      }
    },

    clearHighlight() {
      this.highlighter?.unhighlight();
    },

    generateCandidates(selector: string): string[] {
      if (!selector) return [];
      try {
        const el = document.querySelector(selector);
        if (!el) return [];

        const result: string[] = [];
        const elParts = this.buildElementParts(el);
        result.push(...elParts);

        let cur: Element = el;
        for (let depth = 0; depth < 3; depth++) {
          const parent = cur.parentElement;
          if (!parent || ['html', 'body'].includes(parent.tagName.toLowerCase())) break;
          const parentParts = this.buildElementParts(parent);
          if (parentParts.length && elParts.length) {
            result.push(`${parentParts[0]} > ${elParts[0]}`);
            result.push(`${parentParts[0]} ${elParts[0]}`);
          }
          cur = parent;
        }

        return [...new Set(result)].filter(s => {
          try {
            document.querySelector(s);
            return true;
          } catch {
            return false;
          }
        });
      } catch {
        return [];
      }
    },

    buildElementParts(el: Element): string[] {
      const parts: string[] = [];
      const tag = el.tagName.toLowerCase();
      const id = el.getAttribute('id')?.trim() || '';
      const classes = Array.from(el.classList)
        .map(c => c.trim())
        .filter(c => c && /^[a-zA-Z_-]/.test(c));

      if (id) {
        parts.push(`#${id}`);
        if (classes.length) parts.push(`#${id}.${classes[0]}`);
        parts.push(`${tag}#${id}`);
      }

      if (classes.length > 1) {
        parts.push(`.${classes.join('.')}`);
        parts.push(`${tag}.${classes.join('.')}`);
      }

      const limit = Math.min(classes.length, 3);
      for (let i = 0; i < limit; i++) {
        parts.push(`${tag}.${classes[i]}`);
        parts.push(`.${classes[i]}`);
      }

      parts.push(tag);
      return parts;
    },
  },
});
</script>

<style lang="scss">
.selector-picker-dropdown {
  .dropdown-toggle {
    font-size: 12px !important;
    padding: 0 6px !important;
  }

  .dropdown-menu {
    min-width: 300px;
    max-height: 320px;
    overflow-y: auto;
  }
}

.picker-heading {
  font-size: 10px !important;
  color: #6c7086 !important;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  padding: 4px 16px !important;
}

.picker-item {
  padding: 5px 16px;
  font-size: 12px;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  color: #cdd6f4;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 340px;

  &:hover {
    background: rgba(137, 180, 250, 0.1);
    color: #89b4fa;
  }
}

.picker-item-active {
  background: rgba(137, 180, 250, 0.15);
  color: #89b4fa;
}

.picker-empty {
  font-size: 12px !important;
  color: #6c7086 !important;
}
</style>
