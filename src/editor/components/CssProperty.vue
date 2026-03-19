<template>
  <b-col cols="3" align-self="center" class="css-property">
    <slot />
  </b-col>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'CssProperty',
});
</script>

<style lang="scss" scoped>
.css-property {
  font-size: 13px;
  text-align: right;
  padding-left: 0 !important;
  padding-right: 10px !important;
}
</style>
