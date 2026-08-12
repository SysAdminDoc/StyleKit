<template>
  <div class="selective-sync">
    <div class="description mb-3">
      Choose which URL-keyed styles participate in Google Drive, WebDAV, and
      S3 sync. StyleKit does not currently store folders, so selection is per
      style. Gist backups remain complete exports.
    </div>

    <div v-if="error" class="selection-error mb-2" role="alert">
      {{ error }}
    </div>
    <div v-if="status" class="selection-status mb-2" role="status">
      {{ status }}
    </div>

    <div class="mode-options mb-2" role="radiogroup" aria-label="Sync scope">
      <label>
        <input v-model="mode" type="radio" value="all" />
        Sync all styles
      </label>
      <label>
        <input v-model="mode" type="radio" value="selected" />
        Sync only selected styles
      </label>
    </div>

    <div v-if="mode === 'selected'" class="selection-panel mb-2">
      <div class="selection-toolbar mb-2">
        <span>{{ selectedCount }} of {{ styleKeys.length }} selected</span>
        <app-button size="sm" :disabled="busy" @click="selectAll">
          Select all
        </app-button>
        <app-button size="sm" :disabled="busy" @click="selectedUrls = []">
          Select none
        </app-button>
      </div>
      <div v-if="styleKeys.length === 0" class="description">
        No saved styles are available.
      </div>
      <label v-for="url in styleKeys" :key="url" class="style-choice">
        <input
          v-model="selectedUrls"
          type="checkbox"
          :value="url"
          :aria-label="`Sync style ${url}`"
        />
        <span>{{ url }}</span>
        <small v-if="!currentStyleKeys.includes(url)">
          deleted locally; retained for tombstone sync
        </small>
      </label>
    </div>

    <app-button
      size="sm"
      variant="primary"
      :disabled="busy"
      @click="save"
    >
      {{ busy ? 'Saving...' : 'Save sync selection' }}
    </app-button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { SelectiveSyncConfig } from '@stylekit/types';
import AppButton from '../AppButton.vue';
import {
  getSelectiveSyncConfig,
  setSelectiveSyncConfig,
} from '../../utils';

export default defineComponent({
  name: 'TheSelectiveSync',
  components: { AppButton },

  data(): {
    mode: SelectiveSyncConfig['mode'];
    selectedUrls: string[];
    busy: boolean;
    status: string;
    error: string;
  } {
    return {
      mode: 'all',
      selectedUrls: [],
      busy: true,
      status: '',
      error: '',
    };
  },

  computed: {
    currentStyleKeys(): string[] {
      return Object.keys(this.$store.state.styles || {}).sort();
    },

    styleKeys(): string[] {
      return Array.from(
        new Set([...this.currentStyleKeys, ...this.selectedUrls])
      ).sort();
    },

    selectedCount(): number {
      return this.styleKeys.filter(url => this.selectedUrls.includes(url)).length;
    },
  },

  created() {
    void this.load();
  },

  methods: {
    async load(): Promise<void> {
      try {
        const config = await getSelectiveSyncConfig();
        this.mode = config.mode;
        this.selectedUrls = [...config.urls];
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      } finally {
        this.busy = false;
      }
    },

    selectAll(): void {
      this.selectedUrls = [...this.styleKeys];
    },

    async save(): Promise<void> {
      this.busy = true;
      this.status = '';
      this.error = '';
      try {
        const config = await setSelectiveSyncConfig({
          mode: this.mode,
          urls: this.mode === 'selected' ? this.selectedUrls : [],
        });
        this.mode = config.mode;
        this.selectedUrls = [...config.urls];
        this.status =
          config.mode === 'all'
            ? 'All styles will sync.'
            : `${config.urls.length} selected ${
                config.urls.length === 1 ? 'style' : 'styles'
              } will sync.`;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      } finally {
        this.busy = false;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.description {
  color: #585b70;
  font-size: 14px;
}

.mode-options,
.selection-toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.mode-options label,
.style-choice {
  align-items: center;
  display: flex;
  gap: 6px;
}

.selection-panel {
  border: 1px solid #d9dce3;
  border-radius: 8px;
  max-height: 280px;
  overflow-y: auto;
  padding: 10px;
}

.selection-toolbar {
  position: sticky;
  top: 0;
}

.selection-toolbar span {
  margin-right: auto;
}

.style-choice {
  margin-bottom: 6px;
  overflow-wrap: anywhere;
}

.style-choice small {
  color: #7c7f93;
}

.selection-error {
  color: #d20f39;
}

.selection-status {
  color: #287a3d;
}
</style>
