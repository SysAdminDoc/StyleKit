<template>
  <div>
    <h2>{{ t('keyboard_shortcuts') }}</h2>

    <b-row align-v="center" class="mb-4">
      <b-col cols="12" class="help">
        <kbd>shift</kbd>
        <kbd>option</kbd>
        <kbd>alt</kbd>
        <kbd>ctrl</kbd>
        <kbd>command</kbd>
        +
        <kbd>a-z</kbd>
      </b-col>
    </b-row>

    <shortcut
      id="stylebot"
      :label="t('toggle_editor')"
      @update:model-value="input('stylebot', $event)"
    />

    <shortcut
      id="style"
      :label="t('toggle_styling')"
      @update:model-value="input('style', $event)"
    />

    <shortcut
      id="readability"
      :label="t('toggle_readability')"
      @update:model-value="input('readability', $event)"
    />

    <shortcut
      id="grayscale"
      :label="t('toggle_grayscale')"
      @update:model-value="input('grayscale', $event)"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { StylebotCommandName } from '@stylekit/types';

import Shortcut from './Shortcut.vue';

export default defineComponent({
  name: 'TheKeyboardShortcuts',

  components: {
    Shortcut,
  },

  methods: {
    input(name: StylebotCommandName, value: string) {
      const commands = { ...this.$store.state.commands };
      commands[name] = value;
      this.$store.dispatch('setCommands', commands);
    },
  },
});
</script>

<style lang="scss" scoped>
kbd {
  font-size: 11px;
  margin: 0 1px;
  display: inline-block;
  height: 20px;
}

.help {
  font-size: 12px;
}
</style>
