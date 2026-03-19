<template>
  <b-col cols="9" class="css-property-value">
    <slot />
  </b-col>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CssPropertyValue',
});
</script>

<style lang="scss" scoped>
.css-property-value {
  padding: 0;
  font-size: 12px;
  text-align: left;
}
</style>
