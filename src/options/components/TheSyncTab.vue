<template>
  <div class="pt-3">
    <b-alert v-model="showImportSuccessAlert" variant="success" dismissible>
      {{ t('import_success') }}
    </b-alert>

    <b-alert v-model="showImportErrorAlert" variant="danger" dismissible>
      {{ t('import_error', [importError]) }}
    </b-alert>

    <b-alert v-model="showRollbackRestoreSuccessAlert" variant="success" dismissible>
      Restored styles from the last rollback snapshot.
    </b-alert>

    <b-alert v-model="showRollbackRestoreErrorAlert" variant="danger" dismissible>
      Restore failed: {{ rollbackRestoreError }}
    </b-alert>

    <b-row no-gutters class="mt-5 mb-1">
      <h2>{{ t('sync_via_google_drive') }}</h2>
    </b-row>

    <the-google-drive-sync />

    <b-row no-gutters class="mt-5 mb-1">
      <h2>GitHub Gist Backup</h2>
    </b-row>

    <b-row no-gutters class="description mb-3">
      Backup and restore styles to a private GitHub Gist.
      Requires a Personal Access Token with gist scope.
    </b-row>

    <b-row no-gutters class="mb-4">
      <b-col>
        <the-gist-backup />
      </b-col>
    </b-row>

    <b-row no-gutters class="mt-5">
      <h2>{{ t('backup') }}</h2>
    </b-row>

    <b-row no-gutters class="description mb-4">
      {{ t('backup_description') }}
    </b-row>

    <b-row
      v-if="lastRollbackSnapshot"
      no-gutters
      class="rollback-panel mb-4"
    >
      <b-col>
        <div class="rollback-title">Last rollback snapshot</div>
        <div class="description mb-2">{{ lastRollbackDescription }}</div>
        <app-button
          :disabled="restoringRollback"
          @click="restoreLastRollback"
        >
          {{ restoringRollback ? 'Restoring...' : 'Restore last rollback' }}
        </app-button>
      </b-col>
    </b-row>

    <b-row no-gutters>
      <b-col>
        <app-button class="mr-4" variant="primary" @click="exportJson">
          {{ t('export') }}
        </app-button>

        <app-button class="mr-4" @click="exportCss">
          {{ t('export_css') }}
        </app-button>

        <app-button @click="importJson">
          {{ t('import') }}
        </app-button>
      </b-col>
    </b-row>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { StylesRollbackSnapshot } from '@stylekit/types';

import AppButton from './AppButton.vue';
import TheGoogleDriveSync from './sync/TheGoogleDriveSync.vue';
import TheGistBackup from './sync/TheGistBackup.vue';

import {
  importStylesWithFilePicker,
  exportAsJSONFile,
  exportAsCSSFile,
} from '../utils';

export default defineComponent({
  name: 'TheSyncTab',

  components: {
    AppButton,
    TheGoogleDriveSync,
    TheGistBackup,
  },

  data(): {
    showImportErrorAlert: boolean;
    showImportSuccessAlert: boolean;
    showRollbackRestoreErrorAlert: boolean;
    showRollbackRestoreSuccessAlert: boolean;
    importError: string | DOMException | null;
    rollbackRestoreError: string;
    restoringRollback: boolean;
  } {
    return {
      importError: null,
      showImportErrorAlert: false,
      showImportSuccessAlert: false,
      showRollbackRestoreErrorAlert: false,
      showRollbackRestoreSuccessAlert: false,
      rollbackRestoreError: '',
      restoringRollback: false,
    };
  },

  computed: {
    lastRollbackSnapshot(): StylesRollbackSnapshot | null {
      return this.$store.state.lastStylesRollbackSnapshot;
    },

    lastRollbackDescription(): string {
      const snapshot = this.lastRollbackSnapshot;

      if (!snapshot) {
        return '';
      }

      const reasonLabels: Record<string, string> = {
        'json-import': 'JSON import',
        'gist-import': 'Gist import',
        'google-drive-sync': 'Google Drive sync',
      };
      const reason = reasonLabels[snapshot.reason] || snapshot.reason;
      const createdAt = new Date(snapshot.createdAt).toLocaleString();

      return `${reason} rollback from ${createdAt}`;
    },
  },

  created() {
    this.$store.dispatch('getLastStylesRollbackSnapshot');
  },

  methods: {
    exportJson(): void {
      exportAsJSONFile(this.$store.state.styles);
    },

    exportCss(): void {
      exportAsCSSFile(this.$store.state.styles);
    },

    async importJson(): Promise<void> {
      try {
        const styles = await importStylesWithFilePicker();
        await this.$store.dispatch('setAllStyles', {
          styles,
          rollbackReason: 'json-import',
        });

        this.showImportErrorAlert = false;
        this.showImportSuccessAlert = true;
      } catch (e) {
        this.importError = e;
        this.showImportErrorAlert = true;
        this.showImportSuccessAlert = false;
      }
    },

    async restoreLastRollback(): Promise<void> {
      this.restoringRollback = true;
      this.rollbackRestoreError = '';

      try {
        const snapshot = await this.$store.dispatch(
          'restoreLastStylesRollbackSnapshot'
        );

        if (!snapshot) {
          throw new Error('No rollback snapshot is available.');
        }

        this.showRollbackRestoreErrorAlert = false;
        this.showRollbackRestoreSuccessAlert = true;
      } catch (e) {
        this.rollbackRestoreError =
          e instanceof Error ? e.message : 'Unknown error';
        this.showRollbackRestoreErrorAlert = true;
        this.showRollbackRestoreSuccessAlert = false;
      } finally {
        this.restoringRollback = false;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.description {
  font-size: 14px;
}

.rollback-title {
  color: #cdd6f4;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}
</style>
