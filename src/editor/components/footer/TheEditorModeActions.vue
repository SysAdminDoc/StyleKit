<template>
  <b-button-group>
    <b-button
      size="sm"
      :title="`${t('basic_mode_description')} (b)`"
      :aria-label="`${t('basic_mode_description')} (b)`"
      :aria-pressed="mode === 'basic'"
      :variant="mode === 'basic' ? 'secondary' : 'outline-secondary'"
      @click="setMode('basic')"
    >
      <b-icon icon="image" aria-hidden="true" />
    </b-button>

    <b-button
      size="sm"
      :title="`${t('code_mode_description')} (c)`"
      :aria-label="`${t('code_mode_description')} (c)`"
      :aria-pressed="mode === 'code'"
      :variant="mode === 'code' ? 'secondary' : 'outline-secondary'"
      @click="setMode('code')"
    >
      <b-icon icon="code" aria-hidden="true" />
    </b-button>

    <b-button
      size="sm"
      :title="`${t('magic_mode_description')} (m)`"
      :aria-label="`${t('magic_mode_description')} (m)`"
      :aria-pressed="mode === 'magic'"
      :variant="mode === 'magic' ? 'secondary' : 'outline-secondary'"
      @click="setMode('magic')"
    >
      <b-icon icon="star" aria-hidden="true" />
    </b-button>
  </b-button-group>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'TheEditorModeActions',

  computed: {
    mode(): string {
      return this.$store.state.options.mode;
    },
  },

  methods: {
    setMode(mode: string): void {
      this.$store.dispatch('setMode', mode);
    },
  },
});
</script>
