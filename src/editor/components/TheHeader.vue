<template>
  <b-row class="header pl-3 pr-2 py-2 justify-content-md-between" no-gutters>
    <b-col cols="2" class="p-0">
      <the-inspector @select="inspect($event)" />
    </b-col>

    <b-col cols="7" align-self="center" class="px-2">
      <the-css-selector-dropdown />
      <div class="url">
        {{ url }}
        <span v-if="changeCount > 0" class="change-badge" :title="changeCount + ' changes'">
          {{ changeCount }}
        </span>
      </div>
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

  computed: {
    url(): string {
      return this.$store.state.url;
    },

    changeCount(): number {
      return this.$store.state.cssHistoryIndex;
    },
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

.url {
  color: #6c7086;
  font-size: 12px;
  padding: 0 8px;
  margin-top: 3px;
}

.change-badge {
  display: inline-block;
  background: #89b4fa;
  color: #1e1e2e;
  font-size: 10px;
  font-weight: 700;
  padding: 0 5px;
  border-radius: 8px;
  line-height: 16px;
  margin-left: 4px;
  vertical-align: middle;
}
</style>
