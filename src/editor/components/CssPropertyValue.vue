<template>
  <b-col cols="9" class="css-property-value">
    <slot />
  </b-col>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
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
