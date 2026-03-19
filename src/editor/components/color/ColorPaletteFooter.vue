<template>
  <div>
    <color-palette-picker class="color-palette-picker mt-1" />
    <color-input v-model="localValue" class="color-input mt-1 ml-2" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import ColorInput from './ColorInput.vue';
import ColorPalettePicker from './ColorPalettePicker.vue';

export default defineComponent({
  name: 'ColorPaletteFooter',

  components: {
    ColorInput,
    ColorPalettePicker,
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

<style lang="scss" scoped>
.color-palette-picker {
  float: left;
  margin-left: -2px;
}

.color-input {
  float: right;
}
</style>
