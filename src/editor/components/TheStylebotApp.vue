<template>
  <div class="stylebot-app">
    <the-stylebot v-if="visible" />
    <the-keyboard-shortcuts />
    <the-help-dialog v-if="help" />
    <the-onboarding v-if="visible" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { StylebotCommands } from '@stylekit/types';

import TheStylebot from './TheStylebot.vue';
import TheHelpDialog from './shortcuts/TheHelpDialog.vue';
import TheKeyboardShortcuts from './shortcuts/TheKeyboardShortcuts.vue';
import TheOnboarding from './TheOnboarding.vue';

export default defineComponent({
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
