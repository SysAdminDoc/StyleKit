<template>
  <div class="style-import">
    <div class="style-import-overlay" @click="$emit('cancel')" />
    <div class="style-import-modal">
      <h5 class="mb-3">Import CSS from URL</h5>

      <b-form-input
        v-model="url"
        placeholder="CSS file URL (e.g. https://example.com/style.css)"
        autofocus
        class="mb-2"
      />

      <b-form-input
        v-model="targetUrl"
        placeholder="Apply to URL pattern (e.g. *.example.com)"
        class="mb-3"
      />

      <div v-if="error" class="import-error mb-2">{{ error }}</div>

      <div v-if="preview" class="import-preview mb-3">
        <div class="preview-label">Preview ({{ previewLines }} lines)</div>
        <pre class="preview-code">{{ preview }}</pre>
      </div>

      <div class="import-actions">
        <app-button @click="$emit('cancel')">Cancel</app-button>
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
import { defineComponent } from 'vue';
import AppButton from '../AppButton.vue';

export default defineComponent({
  name: 'StyleImportFromUrl',

  components: {
    AppButton,
  },

  data(): {
    url: string;
    targetUrl: string;
    preview: string;
    error: string;
    fetching: boolean;
  } {
    return {
      url: '',
      targetUrl: '',
      preview: '',
      error: '',
      fetching: false,
    };
  },

  computed: {
    previewLines(): number {
      return this.preview.split('\n').length;
    },
  },

  methods: {
    async fetchCss(): Promise<void> {
      this.error = '';
      this.preview = '';
      this.fetching = true;

      try {
        const response = await fetch(this.url);
        if (!response.ok) {
          this.error = `Failed to fetch: ${response.status} ${response.statusText}`;
          return;
        }

        const text = await response.text();
        if (!text.trim()) {
          this.error = 'URL returned empty content';
          return;
        }

        this.preview = text;
      } catch (e) {
        this.error =
          'Failed to fetch CSS. The URL may be invalid or blocked by CORS.';
      } finally {
        this.fetching = false;
      }
    },

    importStyle(): void {
      this.$emit('import', {
        url: this.targetUrl,
        css: this.preview,
      });
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
