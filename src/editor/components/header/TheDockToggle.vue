<template>
  <b-button
    :title="dockedRight ? 'Move panel to left' : 'Move panel to right'"
    variant="sm"
    @click="toggleDock"
  >
    <b-icon :icon="dockedRight ? 'arrow-bar-left' : 'arrow-bar-right'" />
  </b-button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { StylebotLayout } from '@stylekit/types';

export default defineComponent({
  name: 'TheDockToggle',

  computed: {
    layout(): StylebotLayout {
      return this.$store.state.options.layout;
    },

    dockedRight(): boolean {
      return this.layout.dockLocation === 'right';
    },
  },

  methods: {
    toggleDock(): void {
      this.$store.dispatch('setLayout', {
        ...this.layout,
        dockLocation: this.dockedRight ? 'left' : 'right',
      });
    },
  },
});
</script>
