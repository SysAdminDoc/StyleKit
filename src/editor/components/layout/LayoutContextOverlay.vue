<template>
  <div class="layout-context-control">
    <button
      type="button"
      class="layout-overlay-toggle"
      :class="{ active: visible }"
      :disabled="!context"
      :aria-pressed="visible"
      @click="toggle"
    >
      {{ buttonLabel }}
    </button>
    <span class="layout-context-summary" role="status">
      {{ contextSummary }}
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import {
  LayoutOverlay,
  getLayoutContext,
  type LayoutContext,
} from '@stylekit/highlighter';

export default defineComponent({
  name: 'LayoutContextOverlay',

  data(): { overlay: LayoutOverlay; visible: boolean } {
    return {
      overlay: new LayoutOverlay(),
      visible: false,
    };
  },

  computed: {
    activeSelector(): string {
      return this.$store.state.activeSelector;
    },

    css(): string {
      return this.$store.state.css;
    },

    context(): LayoutContext | null {
      void this.css;
      return getLayoutContext(this.activeSelector);
    },

    buttonLabel(): string {
      if (this.visible) return 'Hide layout overlay';
      if (this.context) return `Show ${this.context.mode} overlay`;
      return 'No grid/flex context';
    },

    contextSummary(): string {
      if (!this.activeSelector) return 'Select an element first';
      if (!this.context) return 'Selection is not in a grid or flex layout';
      const location =
        this.context.relation === 'container'
          ? 'Selected container'
          : 'Parent container';
      return `${location} · ${this.context.items.length} items · row gap ${this.context.rowGap} · column gap ${this.context.columnGap}`;
    },
  },

  watch: {
    activeSelector(): void {
      this.refresh();
    },
    css(): void {
      this.refresh();
    },
  },

  beforeUnmount() {
    this.overlay.hide();
  },

  methods: {
    toggle(): void {
      if (this.visible) {
        this.overlay.hide();
        this.visible = false;
        return;
      }
      this.visible = Boolean(this.overlay.show(this.activeSelector));
    },

    refresh(): void {
      if (!this.visible) return;
      if (!this.overlay.show(this.activeSelector)) {
        this.overlay.hide();
        this.visible = false;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.layout-context-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 2px;
}

.layout-overlay-toggle {
  flex-shrink: 0;
  padding: 3px 8px;
  color: #89b4fa;
  background: transparent;
  border: 1px solid #45475a;
  border-radius: 3px;
  font-size: 10px;
  cursor: pointer;

  &.active {
    color: #1e1e2e;
    background: #a6e3a1;
    border-color: #a6e3a1;
  }

  &:disabled {
    color: #585b70;
    cursor: default;
  }
}

.layout-context-summary {
  min-width: 0;
  color: #6c7086;
  font-size: 9px;
  line-height: 1.3;
}
</style>
