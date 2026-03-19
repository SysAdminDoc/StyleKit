<template>
  <div class="basic-color-palette">
    <v-swatches v-model="localValue" inline swatches="text-advanced" />
    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import VSwatches from 'vue3-swatches';

export default defineComponent({
  name: 'BasicColorPalette',

  components: {
    VSwatches,
  },

  props: {
    modelValue: {
      type: String,
      required: true,
    },
  },

  emits: ['update:modelValue'],

  computed: {
    localValue: {
      get(): string {
        return this.modelValue;
      },
      set(val: string): void {
        this.$emit('update:modelValue', val);
      },
    },
  },
});
</script>

<style lang="scss">
.basic-color-palette {
  width: 262px;
  left: -90px;
  bottom: 36px;
  padding: 10px;
  background: #fff;
  border: 1px solid #ccc;
  line-height: 0;
  position: absolute;
  z-index: 10000000000000;
}
</style>
