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
    <b-col cols="4" class="responsive-actions d-flex align-items-center justify-content-center">
      <b-button
        v-for="bp in breakpoints"
        :key="bp.width"
        size="sm"
        variant="link"
        class="responsive-btn"
        :class="{ active: activeBreakpoint === bp.width }"
        :title="`Preview at ${bp.width}px (${bp.label})`"
        @click="toggleBreakpoint(bp.width)"
      >
        {{ bp.icon }}
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
      activeBreakpoint: 0,
      breakpoints: [
        { width: 375, label: 'Mobile', icon: '\u{1F4F1}' },
        { width: 768, label: 'Tablet', icon: '\u{1F4CB}' },
        { width: 1024, label: 'Laptop', icon: '\u{1F4BB}' },
        { width: 1440, label: 'Desktop', icon: '\u{1F5A5}' },
      ],
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

    toggleBreakpoint(width: number): void {
      if (this.activeBreakpoint === width) {
        // Reset to full width
        this.activeBreakpoint = 0;
        document.documentElement.style.removeProperty('max-width');
        document.documentElement.style.removeProperty('margin');
        document.documentElement.style.removeProperty('transition');
        document.body.style.removeProperty('overflow-x');
      } else {
        this.activeBreakpoint = width;
        document.documentElement.style.setProperty('max-width', `${width}px`, 'important');
        document.documentElement.style.setProperty('margin', '0 auto', 'important');
        document.documentElement.style.setProperty('transition', 'max-width 0.3s ease');
        document.body.style.setProperty('overflow-x', 'hidden');
      }
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

.responsive-actions {
  gap: 2px;
}

.responsive-btn {
  font-size: 14px;
  padding: 2px 5px;
  color: #585b70;
  text-decoration: none;
  opacity: 0.6;
  transition: opacity 0.15s;

  &:hover {
    opacity: 1;
  }

  &.active {
    opacity: 1;
    background: rgba(137, 180, 250, 0.15);
    border-radius: 4px;
  }
}
</style>
