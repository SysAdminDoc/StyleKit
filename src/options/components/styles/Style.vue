<template>
  <b-row class="style px-2 py-3" align-v="center">
    <style-editor
      v-if="edit"
      :initial-url="url"
      :initial-css="css"
      @save="
        // todo: handle syntax errors
        $emit('save', $event);
        edit = false;
      "
      @cancel="edit = false"
    />

    <b-col cols="7" class="style-url-col">
      <b-form-checkbox v-model="enabled" @change="$emit('toggle')">
        {{ url }}
      </b-form-checkbox>

      <span class="style-timestamp">updated {{ formattedTimestamp }}</span>

      <b-form-checkbox
        v-model="shadowRoots"
        class="shadow-root-toggle"
        @update:model-value="$emit('toggle-shadow-roots', $event)"
      >
        Include open shadow roots
      </b-form-checkbox>
      <small class="shadow-root-help">
        Closed shadow roots are browser-protected and cannot be styled.
      </small>

      <app-button
        class="source-toggle"
        size="sm"
        variant="outline-secondary"
        @click="sourceEditorOpen = !sourceEditorOpen"
      >
        {{ source ? 'Live source settings' : 'Add live source' }}
      </app-button>

      <div v-if="sourceEditorOpen" class="source-panel">
        <label :for="sourceInputId">Source CSS URL</label>
        <b-form-input
          :id="sourceInputId"
          v-model="sourceUrl"
          placeholder="https://, http://localhost, or file:///..."
        />

        <label :for="sourceIntervalId" class="mt-2">Reload interval</label>
        <select :id="sourceIntervalId" v-model.number="sourceIntervalMinutes">
          <option :value="1">Every minute</option>
          <option :value="5">Every 5 minutes</option>
          <option :value="15">Every 15 minutes</option>
          <option :value="60">Every hour</option>
        </select>

        <b-form-checkbox v-model="sourceEnabled" class="mt-2">
          Automatically reload this source
        </b-form-checkbox>

        <small class="source-help">
          HTTPS, loopback HTTP, and file sources only. Disabling keeps the last
          saved CSS.
        </small>

        <div class="source-actions mt-2">
          <app-button
            size="sm"
            variant="primary"
            :disabled="!sourceUrl.trim()"
            @click="saveSource"
          >
            Save source
          </app-button>
          <app-button v-if="source" size="sm" @click="$emit('reload-source')">
            Snapshot &amp; reload
          </app-button>
          <app-button
            v-if="sourceStatus?.rollbackAvailable"
            size="sm"
            @click="$emit('rollback-source')"
          >
            Roll back CSS
          </app-button>
          <app-button
            v-if="source"
            size="sm"
            variant="outline-danger"
            @click="$emit('remove-source')"
          >
            Remove source
          </app-button>
        </div>

        <div class="source-status mt-2" role="status" aria-live="polite">
          {{ sourceStatusText }}
        </div>
        <div
          v-if="sourceStatus?.lastError"
          class="source-error mt-1"
          role="alert"
        >
          {{ sourceStatus.lastError }}
        </div>
      </div>
    </b-col>

    <b-col cols="5">
      <b-row align-h="end">
        <app-button
          class="mr-2"
          size="sm"
          variant="outline-primary"
          @click="edit = true"
        >
          {{ t('open_edit_style_dialog') }}
        </app-button>

        <style-delete-button :url="url" @click="$emit('delete')" />
      </b-row>
    </b-col>
  </b-row>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import {
  StyleSourceConfig,
  StyleSourceIntervalMinutes,
  StyleSourceStatus,
} from '@stylekit/types';

import AppButton from '../AppButton.vue';
import StyleEditor from './StyleEditor.vue';
import StyleDeleteButton from './StyleDeleteButton.vue';

export default defineComponent({
  name: 'OptionsStyleItem',

  components: {
    AppButton,
    StyleEditor,
    StyleDeleteButton,
  },

  props: {
    url: {
      type: String,
      required: true,
    },
    css: {
      type: String,
      required: true,
    },
    modifiedTime: {
      type: String,
      required: true,
    },
    initialEnabled: Boolean,
    initialReadability: Boolean,
    initialShadowRoots: Boolean,
    source: {
      type: Object as PropType<StyleSourceConfig | undefined>,
      default: undefined,
    },
    sourceStatus: {
      type: Object as PropType<StyleSourceStatus | undefined>,
      default: undefined,
    },
  },

  data(): {
    enabled: boolean;
    edit: boolean;
    readability: boolean;
    shadowRoots: boolean;
    sourceEditorOpen: boolean;
    sourceUrl: string;
    sourceEnabled: boolean;
    sourceIntervalMinutes: StyleSourceIntervalMinutes;
  } {
    return {
      edit: false,
      enabled: this.initialEnabled,
      readability: this.initialReadability,
      shadowRoots: this.initialShadowRoots,
      sourceEditorOpen: false,
      sourceUrl: this.source?.url || '',
      sourceEnabled: this.source?.enabled ?? true,
      sourceIntervalMinutes: this.source?.intervalMinutes || 5,
    };
  },

  computed: {
    formattedTimestamp(): string {
      return formatDistanceToNow(new Date(this.modifiedTime), {
        addSuffix: true,
      });
    },

    sourceInputId(): string {
      return `style-source-${this.url.replace(/[^a-z0-9]/gi, '-')}`;
    },

    sourceIntervalId(): string {
      return `${this.sourceInputId}-interval`;
    },

    sourceStatusText(): string {
      if (!this.source) return 'No live source configured.';
      if (!this.sourceStatus || this.sourceStatus.state === 'never') {
        return this.source.enabled
          ? 'Ready for the first source check.'
          : 'Live reload is disabled; saved CSS is preserved.';
      }
      const checked = this.sourceStatus.lastCheckedAt
        ? formatDistanceToNow(new Date(this.sourceStatus.lastCheckedAt), {
            addSuffix: true,
          })
        : 'recently';
      if (this.sourceStatus.state === 'updated') {
        return `Source CSS updated ${checked}.`;
      }
      if (this.sourceStatus.state === 'rolled-back') {
        return 'Rolled back to the saved snapshot; live reload is disabled.';
      }
      if (this.sourceStatus.state === 'error') {
        return `Source check failed ${checked}.`;
      }
      return `Source checked ${checked}; CSS was unchanged.`;
    },
  },

  watch: {
    initialEnabled(newVal: boolean): void {
      this.enabled = newVal;
    },

    initialReadability(newVal: boolean): void {
      this.readability = newVal;
    },

    initialShadowRoots(newVal: boolean): void {
      this.shadowRoots = newVal;
    },

    source: {
      deep: true,
      handler(newVal?: StyleSourceConfig): void {
        this.sourceUrl = newVal?.url || '';
        this.sourceEnabled = newVal?.enabled ?? true;
        this.sourceIntervalMinutes = newVal?.intervalMinutes || 5;
      },
    },
  },

  methods: {
    saveSource(): void {
      this.$emit('save-source', {
        url: this.sourceUrl,
        enabled: this.sourceEnabled,
        intervalMinutes: this.sourceIntervalMinutes,
      } as StyleSourceConfig);
    },
  },
});
</script>

<style lang="scss" scoped>
.style {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.style-url-col {
  overflow: hidden;

  .custom-control-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
    max-width: 100%;
  }
}

.style-timestamp {
  opacity: 0.5;
  font-size: 12px;
  font-style: italic;
  margin-left: 24px;
}

.shadow-root-toggle {
  margin-top: 8px;
  margin-left: 24px;
  font-size: 13px;
}

.shadow-root-help {
  display: block;
  margin-left: 48px;
  opacity: 0.65;
}

.source-toggle {
  margin-top: 10px;
  margin-left: 24px;
}

.source-panel {
  margin: 10px 0 0 24px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  font-size: 13px;

  label {
    display: block;
    margin-bottom: 4px;
  }

  select {
    display: block;
    width: 100%;
    padding: 6px 8px;
    color: inherit;
    background: #181825;
    border: 1px solid #45475a;
    border-radius: 4px;
  }
}

.source-help {
  display: block;
  margin-top: 6px;
  opacity: 0.7;
}

.source-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.source-status {
  opacity: 0.8;
}

.source-error {
  color: #f38ba8;
}
</style>
