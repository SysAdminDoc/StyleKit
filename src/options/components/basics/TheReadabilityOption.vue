<template>
  <div>
    <h2>Readability</h2>

    <b-form-checkbox v-model="showReadability" switch>
      Show Readability toggle in popup
    </b-form-checkbox>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'TheReadabilityOption',

  computed: {
    showReadability: {
      get(): boolean {
        return this.$store.state.options['showReadability'];
      },

      set(value: boolean): void {
        this.$store.dispatch('setOption', { name: 'showReadability', value });
      },
    },
  },
});
</script>
