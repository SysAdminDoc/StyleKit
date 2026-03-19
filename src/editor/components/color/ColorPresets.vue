<template>
  <div class="color-presets">
    <button
      v-for="preset in presets"
      :key="preset.name"
      class="color-preset-btn"
      :title="preset.name"
      :style="{ background: preset.color }"
      @click="$emit('select', preset.color)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ColorPresets',

  data() {
    return {
      presets: [
        { name: 'White', color: '#ffffff' },
        { name: 'Light Gray', color: '#e0e0e0' },
        { name: 'Medium Gray', color: '#9e9e9e' },
        { name: 'Dark Gray', color: '#424242' },
        { name: 'Black', color: '#000000' },
        { name: 'Link Blue', color: '#1a73e8' },
        { name: 'Sky Blue', color: '#03a9f4' },
        { name: 'Teal', color: '#009688' },
        { name: 'Green', color: '#4caf50' },
        { name: 'Yellow', color: '#ffeb3b' },
        { name: 'Orange', color: '#ff9800' },
        { name: 'Red', color: '#f44336' },
        { name: 'Pink', color: '#e91e63' },
        { name: 'Purple', color: '#9c27b0' },
        { name: 'Transparent', color: 'transparent' },
      ],
    };
  },
});
</script>

<style lang="scss" scoped>
.color-presets {
  display: grid;
  grid-template-columns: repeat(8, 20px);
  gap: 3px;
  margin-bottom: 6px;
}

.color-preset-btn {
  width: 20px;
  height: 20px;
  border: 1px solid #666;
  border-radius: 3px;
  cursor: pointer;
  padding: 0;

  &:hover {
    border-color: #fff;
    transform: scale(1.15);
  }
}
</style>
