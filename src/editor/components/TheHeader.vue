<template>
  <b-row class="header pl-3 pr-2 py-2 justify-content-md-between" no-gutters>
    <b-col cols="2" class="p-0">
      <the-inspector @select="inspect($event)" />
    </b-col>

    <b-col cols="7" align-self="center" class="px-2">
      <the-css-selector-dropdown />
    </b-col>

    <b-col cols="3">
      <the-window-actions />
    </b-col>
  </b-row>
</template>

<script lang="ts">
import Vue from 'vue';

import TheInspector from './header/TheInspector.vue';
import TheWindowActions from './header/TheWindowActions.vue';
import TheCssSelectorDropdown from './header/TheCssSelectorDropdown.vue';

export default Vue.extend({
  name: 'TheHeader',

  components: {
    TheInspector,
    TheWindowActions,
    TheCssSelectorDropdown,
  },

  data(): {
    selector: string | null;
  } {
    return {
      selector: null,
    };
  },

  methods: {
    inspect(selector: string): void {
      this.$store.commit('setActiveSelector', selector);
    },
  },
});
</script>

<style lang="scss" scoped>
.header {
  flex-shrink: 0;
  background: #181825;
  border-bottom: 1px solid #45475a;
}
</style>
