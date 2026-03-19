<template>
  <button
    :disabled="disabled"
    class="color-picker-toggle"
    :style="{ background: `${modelValue}` }"
    @click="$emit('click')"
  />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ColorPickerToggle',

  props: {
    modelValue: {
      type: String,
      required: true,
    },
  },

  emits: ['click'],

  computed: {
    disabled(): boolean {
      return !this.$store.state.activeSelector;
    },
  },
});
</script>

<style lang="scss" scoped>
.color-picker-toggle {
  width: 45px;
  height: 28px;
  padding: 4px;
  border: none;
  float: left;
  background: #eee;
}
</style>
