<template>
  <vue-draggable-resizable
    :class="`stylebot ${layout.dockLocation} stylebot-dark`"
    class-name-resizing="stylebot-resizing"
    class-name-active="stylebot-resizing-active"
    drag-handle=".stylebot-null"
    :x="x"
    :w="width"
    :h="height"
    :z="100000000"
    :min-width="300"
    :active="resizing"
    :draggable="false"
    :prevent-deactivation="true"
    :handles="handles"
    @resizing="onResizing"
    @activated="onActivated"
    @resizestop="onResizeStop"
  >
    <div
      class="edge-drag-handle"
      :class="dockedRight ? 'handle-on-left' : 'handle-on-right'"
      @mousedown.prevent="onEdgeDragStart"
    />
    <slot></slot>
  </vue-draggable-resizable>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { StylebotLayout, StylebotEditingMode } from '@stylekit/types';

export default defineComponent({
  name: 'TheStylebotResizer',

  data: () => {
    return {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      edgeDragging: false,
      edgeDragStartX: 0,
      edgeDragStartWidth: 0,
    };
  },

  computed: {
    resizing(): boolean {
      return this.$store.state.resizing;
    },

    mode(): StylebotEditingMode {
      return this.$store.state.options.mode;
    },

    layout(): StylebotLayout {
      return this.$store.state.options.layout;
    },

    darkMode(): boolean {
      return this.$store.state.options.darkMode;
    },

    visible(): boolean {
      return this.$store.state.visible;
    },

    dockedRight(): boolean {
      if (this.layout.dockLocation === 'right') {
        return true;
      }

      return false;
    },

    width(): number {
      return this.layout.width;
    },

    height(): number {
      return this.windowHeight;
    },

    x(): number {
      if (this.dockedRight) {
        const clientWidth = document.documentElement.clientWidth;
        return clientWidth - this.width;
      }

      return 0;
    },

    handles(): Array<'ml' | 'mr'> {
      return this.dockedRight ? ['ml'] : ['mr'];
    },
  },

  watch: {
    layout() {
      this.adjustPageLayout();
    },
  },

  created() {
    this.adjustPageLayout();
    window.addEventListener('resize', this.onWindowResize);
  },

  unmounted() {
    this.adjustPageLayout();
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('mousemove', this.onEdgeDragMove);
    window.removeEventListener('mouseup', this.onEdgeDragEnd);
  },

  methods: {
    onWindowResize() {
      this.windowWidth = window.innerWidth;
      this.windowHeight = window.innerHeight;
      this.adjustPageLayout();
    },

    onActivated() {
      this.$store.commit('setInspecting', false);
    },

    onResizing(x: number, y: number, width: number) {
      this.$store.dispatch('setLayout', {
        ...this.layout,
        width,
      });
    },

    onResizeStop(x: number, y: number, width: number) {
      this.$store.dispatch('setLayout', {
        ...this.layout,
        width,
      });
    },

    onEdgeDragStart(e: MouseEvent) {
      this.edgeDragging = true;
      this.edgeDragStartX = e.clientX;
      this.edgeDragStartWidth = this.layout.width;
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
      window.addEventListener('mousemove', this.onEdgeDragMove);
      window.addEventListener('mouseup', this.onEdgeDragEnd);
    },

    onEdgeDragMove(e: MouseEvent) {
      if (!this.edgeDragging) return;
      const delta = e.clientX - this.edgeDragStartX;
      const newWidth = this.dockedRight
        ? Math.max(300, this.edgeDragStartWidth - delta)
        : Math.max(300, this.edgeDragStartWidth + delta);
      this.$store.dispatch('setLayout', { ...this.layout, width: newWidth });
    },

    onEdgeDragEnd() {
      this.edgeDragging = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', this.onEdgeDragMove);
      window.removeEventListener('mouseup', this.onEdgeDragEnd);
    },

    adjustPageLayout() {
      // todo: this needs a lot of work to be more robust.
      if (this.layout.adjustPageLayout && this.visible) {
        if (this.layout.dockLocation === 'left') {
          document.body.style.width = ``;
          document.body.style.marginLeft = `${this.layout.width}px`;
        } else {
          document.body.style.marginLeft = ``;
          document.body.style.width = `calc(100% - ${this.layout.width}px)`;
        }
      } else {
        document.body.style.width = ``;
        document.body.style.marginLeft = ``;
      }
    },
  },
});
</script>

<style lang="scss">
.stylebot {
  &.vdr {
    position: fixed;
    border: 1px solid #313244;

    &.stylebot-resizing,
    &.stylebot-resizing-active {
      border: 5px solid #0062cc;
    }

    .handle {
      display: none;
    }

    &.left {
      left: 0;
    }
  }
}

.edge-drag-handle {
  position: absolute;
  top: 0;
  width: 5px;
  height: 100%;
  cursor: ew-resize;
  z-index: 10;
  background: transparent;
  transition: background 0.15s;

  &:hover {
    background: rgba(137, 180, 250, 0.25);
  }

  &.handle-on-left {
    left: 0;
  }

  &.handle-on-right {
    right: 0;
  }
}
</style>
