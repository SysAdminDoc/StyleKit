<template>
  <transition name="toast-fade">
    <div v-if="visible" class="stylebot-toast">
      <span class="toast-message">{{ message }}</span>
      <button v-if="canUndo" class="toast-undo-btn" @click="undo">
        Undo
      </button>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'TheToast',

  data() {
    return {
      visible: false,
      message: '',
      timer: null as ReturnType<typeof setTimeout> | null,
    };
  },

  computed: {
    canUndo(): boolean {
      return this.$store.state.cssHistoryIndex > 0;
    },

    css(): string {
      return this.$store.state.css;
    },

    cssHistoryIndex(): number {
      return this.$store.state.cssHistoryIndex;
    },
  },

  watch: {
    cssHistoryIndex(newVal: number, oldVal: number): void {
      if (newVal !== oldVal && this.$store.state.visible) {
        this.showToast('Style updated');
      }
    },
  },

  methods: {
    showToast(msg: string): void {
      this.message = msg;
      this.visible = true;

      if (this.timer) {
        clearTimeout(this.timer);
      }

      this.timer = setTimeout(() => {
        this.visible = false;
      }, 2500);
    },

    undo(): void {
      this.$store.dispatch('undo');
      this.visible = false;
    },
  },
});
</script>

<style lang="scss" scoped>
.stylebot-toast {
  position: absolute;
  bottom: 68px;
  left: 50%;
  transform: translateX(-50%);
  background: #313244;
  color: #cdd6f4;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 10;
  white-space: nowrap;
}

.toast-undo-btn {
  background: none;
  border: none;
  color: #89b4fa;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;

  &:hover {
    color: #b4d0fb;
  }
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.toast-fade-enter,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
