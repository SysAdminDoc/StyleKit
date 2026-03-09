<template>
  <div class="stylebot-app">
    <the-stylebot v-if="visible" />
    <the-keyboard-shortcuts />
    <the-help-dialog v-if="help" />
    <the-onboarding v-if="visible" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import { StylebotCommands } from '@stylebot/types';

import TheStylebot from './TheStylebot.vue';
import TheHelpDialog from './shortcuts/TheHelpDialog.vue';
import TheKeyboardShortcuts from './shortcuts/TheKeyboardShortcuts.vue';
import TheOnboarding from './TheOnboarding.vue';

export default Vue.extend({
  name: 'App',

  components: {
    TheStylebot,
    TheHelpDialog,
    TheKeyboardShortcuts,
    TheOnboarding,
  },

  computed: {
    visible(): boolean {
      return this.$store.state.visible;
    },

    commands(): StylebotCommands | undefined {
      return this.$store.state.commands;
    },

    help(): boolean {
      return this.$store.state.help;
    },
  },
});
</script>
