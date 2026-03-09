<template>
  <div class="stylebot-code-editor-iframe" :style="containerStyle">
    <iframe :src="src" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';

export default Vue.extend({
  name: 'CodeEditorIframe',

  props: {
    heightOffset: {
      type: Number,
      default: 10,
    },
  },

  data(): { src: string } {
    return {
      src: chrome.runtime.getURL('monaco-editor/iframe/index.html'),
    };
  },

  computed: {
    containerStyle(): Record<string, string> {
      return {
        height: `calc(100% - ${this.heightOffset}px)`,
      };
    },
  },
});
</script>

<style lang="scss">
.stylebot-code-editor-iframe {
  iframe {
    width: 100%;
    height: 100%;
    border: none;
    position: relative;
  }
}
</style>
