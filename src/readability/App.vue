<template>
  <the-reader v-if="article" :article="article" :url="url" :source="source" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TheReader from './components/TheReader.vue';

export default defineComponent({
  name: 'App',

  components: {
    TheReader,
  },

  props: {
    url: {
      type: String,
      required: true,
    },

    source: {
      type: String,
      required: true,
    },

    article: {
      type: Object,
      required: true,
    },
  },
});
</script>
