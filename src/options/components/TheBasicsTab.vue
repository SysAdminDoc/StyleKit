<template>
  <div v-if="optionsLoaded" class="pt-2">
    <b-row no-gutters class="mt-5">
      <the-context-menu />
    </b-row>

    <b-row no-gutters class="mt-5">
      <the-readability-option />
    </b-row>

    <b-row no-gutters class="mt-5">
      <the-auto-load-styles />
    </b-row>

    <b-row no-gutters class="mt-5">
      <the-fonts />
    </b-row>

    <b-row no-gutters class="mt-5">
      <the-keyboard-shortcuts />
    </b-row>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

import TheFonts from './basics/TheFonts.vue';
import TheContextMenu from './basics/TheContextMenu.vue';
import TheKeyboardShortcuts from './basics/TheKeyboardShortcuts.vue';
import TheReadabilityOption from './basics/TheReadabilityOption.vue';
import TheAutoLoadStyles from './basics/TheAutoLoadStyles.vue';

export default Vue.extend({
  name: 'TheBasicsTab',

  components: {
    TheFonts,
    TheContextMenu,
    TheKeyboardShortcuts,
    TheReadabilityOption,
    TheAutoLoadStyles,
  },

  computed: {
    optionsLoaded(): boolean {
      return !!this.$store.state.options;
    },
  },
});
</script>
