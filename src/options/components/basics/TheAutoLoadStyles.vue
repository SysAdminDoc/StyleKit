<template>
  <div>
    <h2>Find Styles</h2>

    <b-form-checkbox v-model="autoLoadStyles" switch>
      Auto-load styles when popup opens
    </b-form-checkbox>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'TheAutoLoadStyles',

  computed: {
    autoLoadStyles: {
      get(): boolean {
        return this.$store.state.options['autoLoadStyles'];
      },

      set(value: boolean): void {
        this.$store.dispatch('setOption', { name: 'autoLoadStyles', value });
      },
    },
  },
});
</script>
