<template>
  <b-form-input
    :model-value="modelValue"
    size="sm"
    type="color"
    class="color-input"
    :debounce="150"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ColorInput',

  props: {
    modelValue: {
      type: String,
      required: true,
    },
  },

  emits: ['update:modelValue'],
});
</script>

<style lang="scss" scoped>
.color-input {
  &.form-control {
    width: 50px;
  }
}
</style>
