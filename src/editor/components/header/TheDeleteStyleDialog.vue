<template>
  <div class="stylebot-delete-style-dialog" @keydown="onKeyDown">
    <div
      ref="dialog"
      class="delete-style-dialog-content p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-style-title"
      tabindex="-1"
    >
      <h1 id="delete-style-title" class="title">
        {{ t('delete_style_for_url_title', [url]) }}
      </h1>

      <div class="description text-muted pt-2 pb-4">
        {{ t('delete_style_for_url_description', [url]) }}
      </div>

      <div class="delete-style-dialog-footer">
        <b-button variant="outline-secondary" class="mr-2" @click="close">
          {{ t('cancel') }}
        </b-button>

        <b-button variant="outline-danger" @click="deleteStyle">
          {{ t('delete') }}
        </b-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
  focusFirstElement,
  restoreFocus,
  trapFocus,
} from '../../../shared/utils/accessibility';

export default defineComponent({
  name: 'TheDeleteStyleDialog',

  data() {
    return {
      previouslyFocused: null as HTMLElement | null,
    };
  },

  computed: {
    url(): string {
      return this.$store.state.url;
    },
  },

  mounted() {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.$nextTick(() => focusFirstElement(this.$refs.dialog as HTMLElement));
  },

  beforeUnmount() {
    restoreFocus(this.previouslyFocused);
  },

  methods: {
    close(): void {
      this.$emit('close');
    },

    onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close();
        return;
      }
      trapFocus(event, this.$refs.dialog as HTMLElement);
    },

    deleteStyle(): void {
      this.$store.dispatch('applyCss', { css: '' });
      this.close();
    },
  },
});
</script>

<style lang="scss" scoped>
.stylebot-delete-style-dialog {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000000000;
  display: block;
  width: 100%;
  height: 100%;
  overflow: hidden;
  outline: 0;
  line-height: 24px;
  background: #000000b3;
}

.delete-style-dialog-content {
  position: relative;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  background-color: #fff;
  outline: 0;
  width: 50%;
  max-width: 600px;
  margin: 200px auto;
}

.delete-style-dialog-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  padding: 0.75rem;
}

.title {
  color: #000;
  font-size: 24px;
  font-weight: 250;
}

.description {
  font-weight: 250;
  font-size: 18px;
}
</style>
