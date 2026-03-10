<template>
  <div>
    <the-dock-toggle class="stylebot-window-action dock-action" />
    <the-close-action class="stylebot-window-action close-action" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import TheDockToggle from './TheDockToggle.vue';
import TheCloseAction from './TheCloseAction.vue';

export default Vue.extend({
  name: 'TheWindowActions',

  components: {
    TheDockToggle,
    TheCloseAction,
  },
});
</script>

<style lang="scss">
.stylebot-window-action {
  & .btn-group,
  &.btn-sm,
  & .btn-group > .btn.btn-sm {
    top: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    border: none !important;
    background: none !important;
    position: absolute !important;
    line-height: 21px !important;

    &:focus {
      box-shadow: none !important;
    }
  }

  &.dock-action {
    right: 24px !important;

    &.btn .b-icon {
      font-size: 14px !important;
    }
  }

  &.close-action {
    right: 0 !important;

    &.btn .b-icon {
      font-size: 15px !important;
    }
  }
}
</style>
