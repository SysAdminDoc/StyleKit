<template>
  <div class="gist-backup">
    <div class="gist-token-row mb-3">
      <b-form-input
        v-model="token"
        size="sm"
        class="gist-token-input"
        :type="showToken ? 'text' : 'password'"
        placeholder="GitHub Personal Access Token (gist scope)"
        autocomplete="off"
        @change="saveToken"
      />
      <b-button
        size="sm"
        variant="link"
        class="token-toggle"
        @click="showToken = !showToken"
      >
        {{ showToken ? 'Hide' : 'Show' }}
      </b-button>
    </div>

    <div v-if="status" class="gist-status mb-2" :class="statusType">
      {{ status }}
    </div>

    <div v-if="gistUrl" class="gist-url mb-2">
      <a :href="gistUrl" target="_blank" rel="noopener">{{ gistUrl }}</a>
    </div>

    <div class="gist-actions">
      <app-button
        variant="primary"
        :disabled="!token || exporting"
        @click="exportToGist"
      >
        {{ exporting ? 'Exporting...' : 'Export to Gist' }}
      </app-button>

      <app-button
        :disabled="!token || !gistId || importing"
        @click="importFromGist"
      >
        {{ importing ? 'Importing...' : 'Import from Gist' }}
      </app-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AppButton from '../AppButton.vue';

export default defineComponent({
  name: 'TheGistBackup',

  components: {
    AppButton,
  },

  data(): {
    token: string;
    gistId: string;
    gistUrl: string;
    showToken: boolean;
    status: string;
    statusType: string;
    exporting: boolean;
    importing: boolean;
    confirmOverwrite: boolean;
  } {
    return {
      token: '',
      gistId: '',
      gistUrl: '',
      showToken: false,
      status: '',
      statusType: '',
      exporting: false,
      importing: false,
      confirmOverwrite: false,
    };
  },

  async created() {
    const items = await chrome.storage.local.get(['gistToken', 'gistId', 'gistUrl']);
    this.token = items.gistToken || '';
    this.gistId = items.gistId || '';
    this.gistUrl = items.gistUrl || '';
  },

  methods: {
    saveToken(): void {
      chrome.storage.local.set({ gistToken: this.token });
    },

    async exportToGist(): Promise<void> {
      // Require confirmation before overwriting existing gist
      if (this.gistId && !this.confirmOverwrite) {
        this.confirmOverwrite = true;
        this.status = 'Click Export again to overwrite existing backup';
        this.statusType = 'warning';
        setTimeout(() => {
          this.confirmOverwrite = false;
          if (this.statusType === 'warning') this.status = '';
        }, 5000);
        return;
      }
      this.confirmOverwrite = false;
      this.exporting = true;
      this.status = '';

      try {
        const styles = this.$store.state.styles;
        const content = JSON.stringify(styles, null, 2);

        const body: Record<string, unknown> = {
          description: 'StyleKit CSS Styles Backup',
          files: {
            'stylekit-styles.json': { content },
          },
        };

        let url = 'https://api.github.com/gists';
        let method = 'POST';

        // Update existing gist if we have one
        if (this.gistId) {
          url = `https://api.github.com/gists/${this.gistId}`;
          method = 'PATCH';
        } else {
          body.public = false;
        }

        const response = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `HTTP ${response.status}`);
        }

        const data = await response.json();
        this.gistId = data.id;
        this.gistUrl = data.html_url;

        chrome.storage.local.set({
          gistId: this.gistId,
          gistUrl: this.gistUrl,
        });

        this.status = 'Exported successfully';
        this.statusType = 'success';
      } catch (e) {
        this.status = `Export failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
        this.statusType = 'error';
      } finally {
        this.exporting = false;
      }
    },

    async importFromGist(): Promise<void> {
      this.importing = true;
      this.status = '';

      try {
        const response = await fetch(
          `https://api.github.com/gists/${this.gistId}`,
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const file = data.files['stylekit-styles.json'];

        if (!file) {
          throw new Error('stylekit-styles.json not found in Gist');
        }

        const parsed = JSON.parse(file.content);
        // Support versioned format: { version, styles }
        const styles = parsed?.version && parsed?.styles ? parsed.styles : parsed;

        if (!styles || typeof styles !== 'object' || Array.isArray(styles)) {
          throw new Error('Invalid format: expected a StyleKit styles object');
        }

        this.$store.dispatch('setAllStyles', styles);

        this.status = 'Imported successfully';
        this.statusType = 'success';
      } catch (e) {
        this.status = `Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`;
        this.statusType = 'error';
      } finally {
        this.importing = false;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.gist-token-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.gist-token-input {
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 12px !important;
  flex: 1;
}

.token-toggle {
  font-size: 12px;
  color: #89b4fa;
  text-decoration: none;
  padding: 2px 8px;
}

.gist-status {
  font-size: 13px;
  padding: 4px 0;

  &.success {
    color: #a6e3a1;
  }

  &.error {
    color: #f38ba8;
  }

  &.warning {
    color: #fab387;
  }
}

.gist-url {
  font-size: 12px;

  a {
    color: #89b4fa;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.gist-actions {
  display: flex;
  gap: 8px;
}
</style>
