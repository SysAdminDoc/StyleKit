<template>
  <div class="style-import">
    <div class="style-import-overlay" @click="cancel" />
    <div
      ref="dialog"
      class="style-import-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-import-title"
      tabindex="-1"
      @keydown="onKeyDown"
    >
      <h5 id="style-import-title" class="mb-3">Import CSS from URL</h5>

      <b-form-input
        v-model="url"
        placeholder="CSS file URL (e.g. https://example.com/style.css)"
        aria-label="CSS file URL"
        autofocus
        class="mb-2"
      />

      <b-form-input
        v-model="targetUrl"
        placeholder="Apply to URL pattern (e.g. *.example.com)"
        aria-label="Target URL pattern"
        class="mb-3"
      />

      <div v-if="error" class="import-error mb-2" role="alert">{{ error }}</div>

      <div v-if="preview" class="import-preview mb-3">
        <div class="preview-label">Preview ({{ previewLines }} lines)</div>
        <div v-if="importPreviewSummary" class="preview-summary">
          Import preview: {{ importPreviewSummary }}
        </div>
        <pre class="preview-code">{{ preview }}</pre>
      </div>

      <div class="import-actions">
        <app-button @click="cancel">Cancel</app-button>
        <app-button
          v-if="!preview"
          variant="primary"
          :disabled="!url || fetching"
          @click="fetchCss"
        >
          {{ fetching ? 'Fetching...' : 'Fetch' }}
        </app-button>
        <app-button
          v-if="preview"
          variant="primary"
          :disabled="!targetUrl"
          @click="importStyle"
        >
          Import
        </app-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { getCurrentTimestamp } from '@stylekit/utils';
import { StyleMap } from '@stylekit/types';
import {
  focusFirstElement,
  restoreFocus,
  trapFocus,
} from '../../../shared/utils/accessibility';

import AppButton from '../AppButton.vue';
import { reportDiagnostic } from '../../utils';
import {
  assertValidImportCss,
  createImportPreview,
  createSingleStyleImport,
  getImportDiffText,
  isSafeCssContentType,
} from '../../../utils/style-import';

export default defineComponent({
  name: 'StyleImportFromUrl',

  components: {
    AppButton,
  },

  props: {
    existingStyles: {
      type: Object as PropType<StyleMap>,
      default: () => ({}),
    },
  },

  data(): {
    url: string;
    targetUrl: string;
    preview: string;
    error: string;
    fetching: boolean;
    previouslyFocused: HTMLElement | null;
  } {
    return {
      url: '',
      targetUrl: '',
      preview: '',
      error: '',
      fetching: false,
      previouslyFocused: null,
    };
  },

  computed: {
    previewLines(): number {
      return this.preview.split('\n').length;
    },

    importPreviewSummary(): string {
      if (!this.preview || !this.targetUrl) return '';

      try {
        const parsed = createSingleStyleImport(
          this.targetUrl,
          this.preview,
          getCurrentTimestamp()
        );
        const preview = createImportPreview(
          this.existingStyles,
          parsed.styles,
          'merge'
        );
        return getImportDiffText(preview.diff);
      } catch {
        return '';
      }
    },
  },

  mounted() {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.$nextTick(() => focusFirstElement(this.$refs.dialog as HTMLElement));
  },

  beforeUnmount() {
    restoreFocus(this.previouslyFocused);
  },

  methods: {
    cancel(): void {
      this.$emit('cancel');
    },

    onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.cancel();
        return;
      }
      trapFocus(event, this.$refs.dialog as HTMLElement);
    },

    async fetchCss(): Promise<void> {
      this.error = '';
      this.preview = '';
      this.fetching = true;

      try {
        const response = await fetch(this.url);
        if (!response.ok) {
          throw new Error(
            `Failed to fetch: ${response.status} ${response.statusText}`
          );
        }

        const contentType = response.headers.get('content-type') || '';
        if (!isSafeCssContentType(contentType)) {
          throw new Error(
            `Unexpected content type: ${contentType}. Expected CSS or plain text.`
          );
        }

        const text = await response.text();
        assertValidImportCss(text);

        this.preview = text;
      } catch (e) {
        this.error =
          e instanceof Error
            ? e.message
            : 'Failed to fetch CSS. The URL may be invalid or blocked by CORS.';
        reportDiagnostic('import', 'url-css-preview', e).catch(() => undefined);
      } finally {
        this.fetching = false;
      }
    },

    importStyle(): void {
      try {
        createSingleStyleImport(
          this.targetUrl,
          this.preview,
          getCurrentTimestamp()
        );

        this.$emit('import', {
          url: this.targetUrl,
          css: this.preview,
        });
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Invalid CSS import';
        reportDiagnostic('import', 'url-css-apply', e).catch(() => undefined);
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.style-import {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 100000;
}

.style-import-overlay {
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  position: fixed;
  z-index: 100000;
  background: rgba(0, 0, 0, 0.5);
}

.style-import-modal {
  width: 600px;
  max-width: 90%;
  padding: 24px;
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 100001;
  transform: translate(-50%, -50%);
  background: #1e1e2e;
  border-radius: 12px;
  border: 1px solid #45475a;
  color: #cdd6f4;

  h5 {
    color: #cdd6f4;
    font-weight: 600;
  }
}

.import-error {
  color: #f38ba8;
  font-size: 13px;
}

.import-preview {
  max-height: 300px;
  overflow: auto;
  border: 1px solid #45475a;
  border-radius: 8px;
}

.preview-label {
  font-size: 11px;
  color: #a6adc8;
  padding: 6px 10px;
  border-bottom: 1px solid #45475a;
  background: #181825;
}

.preview-summary {
  color: #fab387;
  font-size: 11px;
  padding: 6px 10px;
  border-bottom: 1px solid #45475a;
  background: rgba(250, 179, 135, 0.08);
}

.preview-code {
  margin: 0;
  padding: 10px;
  font-size: 12px;
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  color: #cdd6f4;
  background: transparent;
  white-space: pre-wrap;
  word-break: break-all;
}

.import-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
