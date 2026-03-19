<template>
  <b-list-group-item button @click="open">
    <b-icon icon="gear" />
    <span class="pl-2">{{ t('view_options') }}</span>
  </b-list-group-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'ViewOptions',

  methods: {
    open(): void {
      chrome.runtime.openOptionsPage();
      window.close();
    },
  },
});
</script>
