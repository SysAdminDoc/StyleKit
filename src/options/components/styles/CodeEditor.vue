<template>
  <code-editor-iframe />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { IframeMessage, ParentUpdateCssMessage } from '@stylekit/monaco-editor';

import CodeEditorIframe from './CodeEditorIframe.vue';

export default defineComponent({
  name: 'CodeEditor',

  components: {
    CodeEditorIframe,
  },

  props: {
    css: {
      type: String,
      required: true,
    },
  },

  data(): {
    iframeReady: boolean;
    retryTimer: number | null;
  } {
    return {
      iframeReady: false,
      retryTimer: null,
    };
  },

  created() {
    window.addEventListener('message', this.handleMessage);
  },

  mounted() {
    const iframe = this.$el.querySelector('iframe');
    if (iframe) {
      iframe.addEventListener('load', () => {
        this.startRetryingSendCss();
      });
    }
  },

  beforeUnmount() {
    window.removeEventListener('message', this.handleMessage);
    this.stopRetrying();
  },

  methods: {
    getIframeContentWindow(): Window | null | undefined {
      return this.$el.querySelector('iframe')?.contentWindow;
    },

    sendCssToIframe(): void {
      const message: ParentUpdateCssMessage = {
        css: this.css,
        type: 'stylebotCssUpdate',
      };

      const contentWindow = this.getIframeContentWindow();
      if (contentWindow) {
        contentWindow.postMessage(message, chrome.runtime.getURL('/'));
      }
    },

    startRetryingSendCss(): void {
      if (this.iframeReady) {
        return;
      }

      let attempts = 0;
      const maxAttempts = 50;

      this.retryTimer = window.setInterval(() => {
        attempts++;

        if (this.iframeReady || attempts >= maxAttempts) {
          this.stopRetrying();
          return;
        }

        this.sendCssToIframe();
      }, 100);
    },

    stopRetrying(): void {
      if (this.retryTimer !== null) {
        window.clearInterval(this.retryTimer);
        this.retryTimer = null;
      }
    },

    handleMessage(message: {
      source: Window | MessagePort | ServiceWorker | null;
      data: IframeMessage;
    }): void {
      switch (message.data.type) {
        case 'stylebotMonacoIframeLoaded':
          this.handleIframeLoaded();
          break;

        case 'stylebotMonacoIframeCssUpdated':
          this.iframeReady = true;
          this.stopRetrying();
          this.handleIframeCssUpdate(message.data.css);
          break;
      }
    },

    handleIframeLoaded(): void {
      this.iframeReady = true;
      this.stopRetrying();
      this.sendCssToIframe();
    },

    handleIframeCssUpdate(css: string): void {
      this.$emit('update', css);
    },
  },
});
</script>
