<template>
  <div class="material-color-palette">
    <v-swatches
      v-model="localValue"
      inline
      :swatch-size="18"
      :spacing-size="0"
      :swatches="swatches"
      :swatch-style="{ borderRadius: 0 }"
    />

    <slot></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import VSwatches from 'vue3-swatches';
import { materialSwatches as swatches } from '../../utils/swatches';

export default defineComponent({
  name: 'MaterialColorPalette',

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

  data() {
    return {
      swatches,
    };
  },

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
.material-color-palette {
  width: 202px;
  left: -80px;
  bottom: 36px;
  padding: 10px;
  background: #fff;
  border: 1px solid #ccc;
  line-height: 0;
  position: absolute;
  z-index: 10000000000000;
}
</style>
