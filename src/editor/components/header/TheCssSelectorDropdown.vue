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

        <dropdown-hack-to-support-shadow-dom>
          <b-dropdown
            right
            size="sm"
            :disabled="disabled"
            variant="outline-secondary"
            class="css-selector-dropdown"
            @show="stopInspecting"
          >
            <the-css-selector-dropdown-item
              v-for="s in selectors"
              :key="s.id"
              :count="s.count"
              :selector="s.value"
            />
          </b-dropdown>
        </dropdown-hack-to-support-shadow-dom>
      </template>
    </b-input-group>
    <the-selector-builder />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { StylebotEditingMode } from '@stylebot/types';

import TheCssSelectorInput from './TheCssSelectorInput.vue';
import TheSelectorBuilder from './TheSelectorBuilder.vue';
import TheCssSelectorDropdownItem from './TheCssSelectorDropdownItem.vue';
import DropdownHackToSupportShadowDom from './../DropdownHackToSupportShadowDom.vue';

export default Vue.extend({
  name: 'TheCssSelectorDropdown',

  components: {
    TheCssSelectorInput,
    TheSelectorBuilder,
    TheCssSelectorDropdownItem,
    DropdownHackToSupportShadowDom,
  },

  data(): {
    pseudoOptions: Array<string>;
  } {
    return {
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

  computed: {
    mode(): StylebotEditingMode {
      return this.$store.state.options.mode;
    },

    selectors(): Array<{ value: string; count: number }> {
      return this.$store.state.selectors;
    },

    disabled(): boolean {
      return this.mode !== 'basic';
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
</style>
