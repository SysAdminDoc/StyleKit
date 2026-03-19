<template>
  <b-list-group-item>
    <b-form-checkbox v-model="readability" switch @change="onChange">
      {{ t('readability') }}
    </b-form-checkbox>
  </b-list-group-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { ToggleReadabilityForTab } from '@stylekit/types';

export default defineComponent({
  name: 'Readability',
  props: {
    initialReadability: Boolean,
  },

  data(): {
    readability: boolean;
  } {
    return {
      readability: this.initialReadability,
    };
  },

  watch: {
    initialReadability(newVal: boolean): void {
      this.readability = newVal;
    },
  },

  methods: {
    onChange(): void {
      chrome.tabs.query({ active: true }, ([tab]) => {
        if (tab.id) {
          const message: ToggleReadabilityForTab = {
            name: 'ToggleReadabilityForTab',
          };

          chrome.tabs.sendMessage(tab.id, message).catch(() => {
            // Content script not available on this tab
          });
        }
      });
    },
  },
});
</script>
