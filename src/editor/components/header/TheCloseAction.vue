<template>
  <b-button
    :title="`${t('close')} (esc)`"
    :aria-label="`${t('close')} (esc)`"
    variant="sm"
    @click="onClick"
  >
    <b-icon icon="x-circle" aria-hidden="true" />
  </b-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'TheCloseAction',

  methods: {
    onClick(): void {
      this.$store.dispatch('closeStylebot');
    },
  },
});
</script>
