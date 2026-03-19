<template>
  <b-row class="footer" align-v="center" no-gutters>
    <b-col cols="4" class="undo-redo-actions d-flex align-items-center pl-2">
      <b-button
        size="sm"
        variant="link"
        class="undo-redo-btn"
        :disabled="!canUndo"
        @click="undo"
        :title="t('undo')"
      >
        &#x21B6;
      </b-button>
      <b-button
        size="sm"
        variant="link"
        class="undo-redo-btn"
        :disabled="!canRedo"
        @click="redo"
        :title="t('redo')"
      >
        &#x21B7;
      </b-button>
      <b-button
        size="sm"
        variant="link"
        class="copy-btn"
        :disabled="!hasCss"
        :title="copyTitle"
        @click="copyCss"
      >
        {{ copyIcon }}
      </b-button>
      <b-button
        size="sm"
        variant="link"
        class="diff-btn"
        :disabled="!hasCss"
        title="View changes"
        @click="$emit('show-diff')"
      >
        &#x2261;
      </b-button>
      <b-button
        size="sm"
        variant="link"
        class="export-btn"
        :disabled="!hasCss"
        :title="exportTitle"
        @click="exportStyle"
      >
        &#x21E5;
      </b-button>
      <b-button
        size="sm"
        variant="link"
        class="reset-btn"
        :class="{ confirming: confirmReset }"
        :disabled="!hasCss"
        :title="confirmReset ? 'Click again to confirm reset' : 'Reset all styles for this page'"
        @click="resetAll"
      >
        {{ confirmReset ? 'Sure?' : '&#x2715;' }}
      </b-button>
    </b-col>
    <b-col><the-editor-mode-actions /></b-col>
  </b-row>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import TheEditorModeActions from './footer/TheEditorModeActions.vue';

export default defineComponent({
  name: 'TheFooter',

  components: {
    TheEditorModeActions,
  },

  data() {
    return {
      copied: false,
      exported: false,
      confirmReset: false,
    };
  },

  computed: {
    canUndo(): boolean {
      return this.$store.state.cssHistoryIndex > 0;
    },
    canRedo(): boolean {
      return (
        this.$store.state.cssHistoryIndex <
        this.$store.state.cssHistory.length - 1
      );
    },
    hasCss(): boolean {
      return !!this.$store.state.css && this.$store.state.css.trim().length > 0;
    },
    copyTitle(): string {
      return this.copied ? 'Copied!' : 'Copy CSS';
    },
    copyIcon(): string {
      return this.copied ? '\u2713' : '\u2398';
    },
    exportTitle(): string {
      return this.exported ? 'Exported!' : 'Export style as JSON';
    },
  },

  methods: {
    undo(): void {
      this.$store.dispatch('undo');
    },
    redo(): void {
      this.$store.dispatch('redo');
    },
    async copyCss(): Promise<void> {
      const css = this.$store.state.css;
      if (!css) return;

      try {
        await navigator.clipboard.writeText(css);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = css;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      this.copied = true;
      setTimeout(() => {
        this.copied = false;
      }, 2000);
    },

    async exportStyle(): Promise<void> {
      const css = this.$store.state.css;
      const url = this.$store.state.url;
      if (!css) return;

      const styleData = JSON.stringify(
        {
          version: 1,
          exportedAt: new Date().toISOString(),
          app: 'StyleKit',
          styles: { [url]: { css, enabled: true, readability: false } },
        },
        null,
        2
      );

      const blob = new Blob([styleData], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `stylekit-${url.replace(/[^a-z0-9]/gi, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      this.exported = true;
      setTimeout(() => {
        this.exported = false;
      }, 2000);
    },

    resetAll(): void {
      if (this.confirmReset) {
        this.confirmReset = false;
        this.$store.dispatch('applyCss', { css: '' });
      } else {
        this.confirmReset = true;
        setTimeout(() => { this.confirmReset = false; }, 3000);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.footer {
  width: 100%;
  height: 60px;
  flex-shrink: 0;
  position: relative;
  text-align: center;
  background: #181825;
  border-top: 1px solid #45475a;
}

.undo-redo-btn {
  font-size: 16px;
  padding: 2px 6px;
  color: #a6adc8;
  text-decoration: none;

  &:hover {
    color: #cdd6f4;
  }

  &:disabled {
    color: #585b70;
  }
}

.copy-btn {
  font-size: 14px;
  padding: 2px 6px;
  color: #a6adc8;
  text-decoration: none;
  margin-left: 4px;

  &:hover {
    color: #cdd6f4;
  }

  &:disabled {
    color: #585b70;
  }
}

.diff-btn {
  font-size: 16px;
  padding: 2px 6px;
  color: #a6adc8;
  text-decoration: none;
  margin-left: 2px;

  &:hover {
    color: #cdd6f4;
  }

  &:disabled {
    color: #585b70;
  }
}

.export-btn {
  font-size: 14px;
  padding: 2px 6px;
  color: #a6adc8;
  text-decoration: none;
  margin-left: 2px;

  &:hover {
    color: #cdd6f4;
  }

  &:disabled {
    color: #585b70;
  }
}

.reset-btn {
  font-size: 13px;
  padding: 2px 6px;
  color: #f38ba8;
  text-decoration: none;
  margin-left: 2px;

  &:hover {
    color: #f5c2e7;
  }

  &:disabled {
    color: #585b70;
  }

  &.confirming {
    color: #1e1e2e;
    background: #f38ba8;
    border-radius: 3px;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 8px;
  }
}
</style>
