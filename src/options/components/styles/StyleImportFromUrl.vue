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
        placeholder="HTTPS, localhost, or file CSS URL"
        aria-label="CSS file URL"
        autofocus
        class="mb-2"
      />

      <b-form-input
        v-model="targetUrl"
        placeholder="Apply to URL pattern (e.g. *.example.com)"
        aria-label="Target URL pattern"
        class="mb-2"
      />

      <b-form-checkbox v-model="liveReload" class="mb-2">
        Keep this style synced with the source
      </b-form-checkbox>

      <label v-if="liveReload" class="reload-interval mb-3">
        Check for changes
        <select v-model.number="intervalMinutes" aria-label="Reload interval">
          <option :value="1">Every minute</option>
          <option :value="5">Every 5 minutes</option>
          <option :value="15">Every 15 minutes</option>
          <option :value="60">Every hour</option>
        </select>
      </label>

      <small v-if="liveReload" class="source-help mb-3">
        HTTPS, loopback HTTP, and file sources are supported. File sources
        require “Allow access to file URLs” in the extension details.
      </small>

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
import { StyleMap, StyleSourceIntervalMinutes } from '@stylekit/types';
import {
  focusFirstElement,
  restoreFocus,
  trapFocus,
} from '../../../shared/utils/accessibility';

import AppButton from '../AppButton.vue';
import { previewStyleSource, reportDiagnostic } from '../../utils';
import {
  createImportPreview,
  createSingleStyleImport,
  getImportDiffText,
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
    liveReload: boolean;
    intervalMinutes: StyleSourceIntervalMinutes;
    previouslyFocused: HTMLElement | null;
  } {
    return {
      url: '',
      targetUrl: '',
      preview: '',
      error: '',
      fetching: false,
      liveReload: false,
      intervalMinutes: 5,
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
        this.preview = await previewStyleSource(this.url);
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
          source: this.liveReload
            ? {
                url: this.url,
                enabled: true,
                intervalMinutes: this.intervalMinutes,
              }
            : undefined,
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

.reload-interval {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;

  select {
    color: #cdd6f4;
    background: #181825;
    border: 1px solid #45475a;
    border-radius: 4px;
    padding: 4px 8px;
  }
}

.source-help {
  display: block;
  color: #a6adc8;
}
</style>
