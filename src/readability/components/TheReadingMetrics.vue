<template>
  <p v-if="metrics.wordCount" class="reading-metrics">
    {{ formattedWordCount }} {{ metrics.wordCount === 1 ? 'word' : 'words' }}
    <span aria-hidden="true">·</span>
    {{ metrics.readingMinutes }} min read
  </p>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { getReadingMetrics, type ReadingMetrics } from '../reading-metrics';

export default defineComponent({
  name: 'TheReadingMetrics',

  props: {
    text: {
      type: String,
      required: true,
    },
  },

  computed: {
    metrics(): ReadingMetrics {
      return getReadingMetrics(this.text);
    },

    formattedWordCount(): string {
      return this.metrics.wordCount.toLocaleString();
    },
  },
});
</script>

<style lang="scss" scoped>
.reading-metrics {
  margin: 8px 0 16px;
  color: inherit;
  font-size: 0.85em;
  line-height: 1.4;
  opacity: 0.75;
}
</style>
