<template>
  <i
    class="bi stylekit-b-icon"
    :class="[`bi-${icon}`, { 'stylekit-b-icon-spin': animation === 'spin' }]"
    :style="iconStyle"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default defineComponent({
  name: 'BIcon',

  props: {
    icon: {
      type: String,
      required: true,
    },

    scale: {
      type: [Number, String],
      default: undefined,
    },

    fontScale: {
      type: [Number, String],
      default: undefined,
    },

    animation: {
      type: String,
      default: undefined,
    },
  },

  computed: {
    iconStyle(): Record<string, string> {
      const scale = Number(this.scale ?? this.fontScale ?? 1);
      if (!Number.isFinite(scale) || scale === 1) return {};
      return { fontSize: `${scale}em` };
    },
  },
});
</script>

<style scoped>
.stylekit-b-icon {
  display: inline-block;
  line-height: 1;
}

.stylekit-b-icon-spin {
  animation: stylekit-b-icon-spin 1s linear infinite;
}

@keyframes stylekit-b-icon-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
