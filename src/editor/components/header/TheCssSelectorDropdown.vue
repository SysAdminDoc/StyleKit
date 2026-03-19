<template>
  <div @click="stopInspecting">
    <b-input-group class="css-selector-input-group">
      <the-css-selector-input :disabled="disabled" />

      <template #append>
        <dropdown-hack-to-support-shadow-dom>
          <b-dropdown
            size="sm"
            :disabled="!activeSelector"
            variant="outline-secondary"
            class="pseudo-selector-dropdown"
            :text="activePseudo || ':'"
          >
            <b-dropdown-item
              v-for="pseudo in pseudoOptions"
              :key="pseudo"
              @click="applyPseudo(pseudo)"
            >
              {{ pseudo }}
            </b-dropdown-item>
          </b-dropdown>
        </dropdown-hack-to-support-shadow-dom>

        <the-selector-picker />

        <b-button
          size="sm"
          variant="outline-secondary"
          class="element-search-btn"
          title="Search elements by selector"
          :disabled="disabled"
          @click="showSearch = !showSearch"
        >
          <b-icon icon="search" />
        </b-button>
      </template>
    </b-input-group>

    <div v-if="showSearch" class="element-search-panel">
      <input
        ref="searchInput"
        v-model="searchQuery"
        class="element-search-input"
        type="text"
        placeholder="Search: .class, #id, tag, or text..."
        autocomplete="off"
        @keydown.enter="doSearch"
        @keydown.escape="showSearch = false"
        @keydown.stop
      />
      <div v-if="searchResults.length > 0" class="element-search-results">
        <div
          v-for="(result, i) in searchResults"
          :key="i"
          class="element-search-result"
          @click="selectResult(result)"
          @mouseenter="highlightResult(result)"
        >
          <span class="result-selector">{{ result }}</span>
          <span class="result-count">{{ getCount(result) }}</span>
        </div>
      </div>
      <div v-else-if="searchQuery && searched" class="element-search-empty">
        No elements found
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { validateSelector } from '@stylekit/css';
import { Highlighter } from '@stylekit/highlighter';
import { getSelector } from '@stylekit/css';

import TheCssSelectorInput from './TheCssSelectorInput.vue';
import TheSelectorPicker from './TheSelectorPicker.vue';
import DropdownHackToSupportShadowDom from './../DropdownHackToSupportShadowDom.vue';

export default defineComponent({
  name: 'TheCssSelectorDropdown',

  components: {
    TheCssSelectorInput,
    TheSelectorPicker,
    DropdownHackToSupportShadowDom,
  },

  data(): {
    pseudoOptions: Array<string>;
    showSearch: boolean;
    searchQuery: string;
    searchResults: string[];
    searched: boolean;
    searchHighlighter: Highlighter | null;
  } {
    return {
      showSearch: false,
      searchQuery: '',
      searchResults: [],
      searched: false,
      searchHighlighter: null,
      pseudoOptions: [
        '(none)',
        ':hover',
        ':focus',
        ':active',
        ':visited',
        ':first-child',
        ':last-child',
        '::before',
        '::after',
        '::placeholder',
      ],
    };
  },

  created() {
    this.searchHighlighter = new Highlighter({ onSelect: () => {} });
  },

  computed: {
    disabled(): boolean {
      return !this.$store.state.visible;
    },

    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

    activePseudo(): string {
      if (!this.activeSelector) return '';
      const match = this.activeSelector.match(/(:{1,2}[\w-]+)$/);
      return match ? match[1] : '';
    },
  },

  methods: {
    stopInspecting(): void {
      this.$store.commit('setInspecting', false);
    },

    doSearch(): void {
      this.searched = true;
      this.searchResults = [];
      const q = this.searchQuery.trim();
      if (!q) return;

      const results: string[] = [];

      // Try as CSS selector
      if (validateSelector(q)) {
        try {
          const els = document.querySelectorAll(q);
          if (els.length > 0) {
            results.push(q);
          }
        } catch { /* invalid selector */ }
      }

      // Also search by tag name, class, or id fragments
      if (results.length === 0) {
        const allElements = document.querySelectorAll('body *:not(#stylebot):not(#stylebot *)');
        const seen = new Set<string>();

        for (const el of Array.from(allElements).slice(0, 5000)) {
          const tag = el.tagName.toLowerCase();
          const id = el.id;
          const classes = Array.from(el.classList);
          const text = el.textContent?.slice(0, 100) || '';

          const matchesQuery =
            tag.includes(q.toLowerCase()) ||
            (id && id.toLowerCase().includes(q.toLowerCase())) ||
            classes.some(c => c.toLowerCase().includes(q.toLowerCase())) ||
            text.toLowerCase().includes(q.toLowerCase());

          if (matchesQuery) {
            const selector = getSelector(el as HTMLElement);
            if (selector && !seen.has(selector)) {
              seen.add(selector);
              results.push(selector);
              if (results.length >= 20) break;
            }
          }
        }
      }

      this.searchResults = results;
    },

    selectResult(selector: string): void {
      this.$store.commit('setActiveSelector', selector);
      this.searchHighlighter?.unhighlight();
      this.showSearch = false;
    },

    highlightResult(selector: string): void {
      if (validateSelector(selector)) {
        this.searchHighlighter?.highlight(selector);
      }
    },

    getCount(selector: string): string {
      try {
        const count = document.querySelectorAll(selector).length;
        return `${count} match${count !== 1 ? 'es' : ''}`;
      } catch {
        return '';
      }
    },

    applyPseudo(pseudo: string): void {
      let selector = this.activeSelector;
      if (!selector) return;

      // Remove existing pseudo suffix
      selector = selector.replace(/(:{1,2}[\w-]+)$/, '');

      // Add new pseudo (unless clearing)
      if (pseudo !== '(none)') {
        selector += pseudo;
      }

      this.$store.commit('setActiveSelector', selector);
    },
  },
});
</script>

<style lang="scss">
.css-selector-input-group {
  .dropdown-toggle {
    line-height: 21px !important;
  }
}

.pseudo-selector-dropdown {
  .dropdown-toggle {
    font-size: 12px !important;
    padding: 0 6px !important;
    min-width: 32px;
  }
}

.element-search-btn {
  padding: 0 6px !important;
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;

  .b-icon {
    width: 12px;
    height: 12px;
  }
}

.element-search-panel {
  padding: 6px 8px;
  background: #181825;
  border-top: 1px solid #313244;
}

.element-search-input {
  width: 100%;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 4px;
  color: #cdd6f4;
  font-size: 12px;
  padding: 4px 8px;
  outline: none;
  box-sizing: border-box;

  &::placeholder {
    color: #585b70;
  }

  &:focus {
    border-color: #89b4fa;
  }
}

.element-search-results {
  max-height: 150px;
  overflow-y: auto;
  margin-top: 4px;
}

.element-search-result {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 3px 6px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;

  &:hover {
    background: rgba(137, 180, 250, 0.1);
  }
}

.result-selector {
  color: #cdd6f4;
  font-family: SFMono-Regular, Consolas, monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.result-count {
  color: #6c7086;
  font-size: 10px;
  flex-shrink: 0;
  margin-left: 8px;
}

.element-search-empty {
  padding: 6px;
  font-size: 11px;
  color: #6c7086;
  text-align: center;
}
</style>
