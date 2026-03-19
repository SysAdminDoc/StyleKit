<template>
  <transition name="toast-slide">
    <div v-if="visible" class="undo-toast">
      <span class="undo-toast-message">{{ message }}</span>
      <button class="undo-toast-btn" @click="undo">Undo</button>
      <div class="undo-toast-progress" :style="{ animationDuration: duration + 'ms' }" />
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'UndoToast',

  props: {
    message: {
      type: String,
      default: '',
    },
    visible: {
      type: Boolean,
      default: false,
    },
    duration: {
      type: Number,
      default: 5000,
    },
  },

  watch: {
    visible(val: boolean) {
      if (val) {
        this.startTimer();
      } else {
        this.clearTimer();
      }
    },
  },

  beforeDestroy() {
    this.clearTimer();
  },

  methods: {
    startTimer() {
      this.clearTimer();
      (this as any)._timer = setTimeout(() => {
        this.$emit('expire');
      }, this.duration);
    },

    clearTimer() {
      if ((this as any)._timer) {
        clearTimeout((this as any)._timer);
        (this as any)._timer = null;
      }
    },

    undo() {
      this.clearTimer();
      this.$emit('undo');
    },
  },
});
</script>

<style lang="scss" scoped>
.undo-toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.undo-toast-message {
  color: #cdd6f4;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.undo-toast-btn {
  background: transparent;
  border: 1px solid rgba(137, 180, 250, 0.4);
  color: #89b4fa;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(137, 180, 250, 0.15);
    border-color: #89b4fa;
  }
}

.undo-toast-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: #89b4fa;
  animation: toast-countdown linear forwards;
  width: 100%;
}

@keyframes toast-countdown {
  from {
    width: 100%;
  }
  to {
    width: 0%;
  }
}

.toast-slide-enter-active {
  transition: all 0.25s ease-out;
}

.toast-slide-leave-active {
  transition: all 0.2s ease-in;
}

.toast-slide-enter,
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}
</style>
