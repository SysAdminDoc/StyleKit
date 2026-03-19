<template>
  <b-form-input
    :disabled="disabled"
    :value="activeSelector"
    size="sm"
    autocomplete="off"
    class="css-selector-input"
    :placeholder="t('enter_css_selector')"
    @blur="blur"
    @focus="focus"
    @input="input"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { validateSelector } from '@stylekit/css';
import { Highlighter } from '@stylekit/highlighter';

export default defineComponent({
  name: 'TheCssSelectorInput',
  props: {
    disabled: {
      type: Boolean,
      required: true,
    },
  },

  data(): { highlighter: Highlighter | null; highlightTimer: ReturnType<typeof setTimeout> | null } {
    return {
      highlighter: null,
      highlightTimer: null,
    };
  },

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },
  },

  created() {
    this.highlighter = new Highlighter({
      onSelect: () => {
        return;
      },
    });
  },

  methods: {
    input(selector: string): void {
      this.$store.commit('setActiveSelector', selector);

      // Debounce highlighting to avoid DOM thrashing on rapid typing
      if (this.highlightTimer) clearTimeout(this.highlightTimer);
      this.highlightTimer = setTimeout(() => {
        if (validateSelector(selector)) {
          this.highlighter?.highlight(selector);
        } else {
          this.highlighter?.unhighlight();
        }
      }, 150);
    },

    focus(): void {
      const selector = this.$store.state.activeSelector;

      if (validateSelector(selector)) {
        this.highlighter?.highlight(selector);
        window.addEventListener('scroll', this.onWindowScroll, true);
      } else {
        this.highlighter?.unhighlight();
      }
    },

    blur(): void {
      this.highlighter?.unhighlight();
      window.removeEventListener('scroll', this.onWindowScroll, true);
    },

    onWindowScroll(): void {
      if (this.activeSelector) {
        this.highlighter?.highlight(this.activeSelector);
      }
    },
  },
});
</script>

<style lang="scss">
.css-selector-input {
  padding: 4px !important;

  &:focus {
    box-shadow: none !important;
  }

  &.form-control {
    margin-left: 8px !important;
  }
}
</style>
