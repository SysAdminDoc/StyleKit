<template>
  <b-form-input
    :model-value="modelValue"
    size="sm"
    autocomplete="off"
    class="color-text-input"
    :debounce="150"
    :disabled="disabled"
    @update:model-value="$emit('update:modelValue', $event)"
    @focus="focus"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ColorTextInput',

  props: {
    modelValue: {
      type: String,
      required: true,
    },
  },

  emits: ['update:modelValue'],

  computed: {
    disabled(): boolean {
      return !this.$store.state.activeSelector;
    },
  },

  methods: {
    focus(event: FocusEvent): void {
      (event.target as HTMLInputElement).select();
    },
  },
});
</script>

<style lang="scss" scoped>
.color-text-input {
  &.form-control {
    float: left;
    width: 100%;
    max-width: 140px;
  }
}
</style>
