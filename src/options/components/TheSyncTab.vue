<template>
  <div class="pt-3">
    <b-alert v-model="showImportSuccessAlert" variant="success" dismissible>
      {{ t('import_success') }}
    </b-alert>

    <b-alert v-model="showImportErrorAlert" variant="danger" dismissible>
      {{ t('import_error', [importError]) }}
    </b-alert>

    <b-alert v-if="pendingJsonImport" show variant="warning" class="mb-4">
      <div class="import-preview-title">JSON import preview</div>
      <div class="description mb-3">
        {{ pendingJsonImportSummary }}. Existing styles are unchanged until
        applied.
      </div>
      <app-button
        class="mr-2"
        variant="primary"
        @click="applyPendingJsonImport"
      >
        Apply import
      </app-button>
      <app-button @click="pendingJsonImport = null">Cancel</app-button>
    </b-alert>

    <b-alert
      v-model="showRollbackRestoreSuccessAlert"
      variant="success"
      dismissible
    >
      Restored styles from the last rollback snapshot.
    </b-alert>

    <b-alert
      v-model="showRollbackRestoreErrorAlert"
      variant="danger"
      dismissible
    >
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
      Backup and restore styles to a private GitHub Gist. Requires a Personal
      Access Token with gist scope.
    </b-row>

    <b-row no-gutters class="mb-4">
      <b-col>
        <the-gist-backup />
      </b-col>
    </b-row>

    <b-row no-gutters class="mt-5 mb-1">
      <h2>Collaborative style packs</h2>
    </b-row>

    <b-row no-gutters class="mb-4">
      <b-col>
        <the-collaborative-packs />
      </b-col>
    </b-row>

    <b-row no-gutters class="mt-5 mb-1">
      <h2>Team spaces</h2>
    </b-row>

    <b-row no-gutters class="mb-4">
      <b-col>
        <the-team-spaces />
      </b-col>
    </b-row>

    <b-row no-gutters class="mt-5">
      <h2>{{ t('backup') }}</h2>
    </b-row>

    <b-row no-gutters class="description mb-4">
      {{ t('backup_description') }}
    </b-row>

    <b-row no-gutters class="mb-3">
      <b-col>
        <b-form-checkbox v-model="minifyCssExport" switch>
          Minify CSS export
        </b-form-checkbox>
        <div class="description mt-1">
          Remove unnecessary whitespace from downloaded CSS. Saved styles and
          JSON backups are not changed.
        </div>
      </b-col>
    </b-row>

    <b-alert v-if="cssExportError" show variant="danger" role="alert">
      CSS export failed: {{ cssExportError }}
    </b-alert>

    <b-row v-if="lastRollbackSnapshot" no-gutters class="rollback-panel mb-4">
      <b-col>
        <div class="rollback-title">Last rollback snapshot</div>
        <div class="description mb-2">{{ lastRollbackDescription }}</div>
        <app-button :disabled="restoringRollback" @click="restoreLastRollback">
          {{ restoringRollback ? 'Restoring...' : 'Restore last rollback' }}
        </app-button>
      </b-col>
    </b-row>

    <b-row no-gutters>
      <b-col>
        <app-button class="mr-4" variant="primary" @click="exportJson">
          {{ t('export') }}
        </app-button>

        <app-button class="mr-4" :disabled="exportingCss" @click="exportCss">
          {{ exportingCss ? 'Exporting CSS...' : t('export_css') }}
        </app-button>

        <app-button @click="importJson">
          {{ t('import') }}
        </app-button>
      </b-col>
    </b-row>

    <b-row no-gutters class="mt-5">
      <h2>Diagnostics</h2>
    </b-row>

    <b-row no-gutters class="description mb-3">
      Export a privacy-safe support bundle with version, browser, permissions,
      storage usage, and recent errors. Saved CSS, tokens, and account data are
      excluded.
    </b-row>

    <b-alert v-if="diagnosticsError" show variant="danger" role="alert">
      Diagnostics export failed: {{ diagnosticsError }}
    </b-alert>

    <b-row no-gutters>
      <b-col>
        <app-button :disabled="exportingDiagnostics" @click="exportDiagnostics">
          {{
            exportingDiagnostics
              ? 'Exporting diagnostics...'
              : 'Export diagnostics'
          }}
        </app-button>
      </b-col>
    </b-row>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type { StylesRollbackSnapshot } from '@stylekit/types';
import type { StyleImportPreview } from '../../utils/style-import';

import AppButton from './AppButton.vue';
import TheGoogleDriveSync from './sync/TheGoogleDriveSync.vue';
import TheGistBackup from './sync/TheGistBackup.vue';
import TheCollaborativePacks from './sync/TheCollaborativePacks.vue';
import TheTeamSpaces from './sync/TheTeamSpaces.vue';

import {
  importStylesWithFilePicker,
  exportAsJSONFile,
  exportAsCSSFile,
  exportDiagnosticsAsJSONFile,
  getImportDiffText,
  reportDiagnostic,
} from '../utils';

export default defineComponent({
  name: 'TheSyncTab',

  components: {
    AppButton,
    TheGoogleDriveSync,
    TheGistBackup,
    TheCollaborativePacks,
    TheTeamSpaces,
  },

  data(): {
    showImportErrorAlert: boolean;
    showImportSuccessAlert: boolean;
    showRollbackRestoreErrorAlert: boolean;
    showRollbackRestoreSuccessAlert: boolean;
    importError: string | DOMException | null;
    rollbackRestoreError: string;
    restoringRollback: boolean;
    pendingJsonImport: StyleImportPreview | null;
    exportingDiagnostics: boolean;
    exportingCss: boolean;
    cssExportError: string;
    diagnosticsError: string;
  } {
    return {
      importError: null,
      showImportErrorAlert: false,
      showImportSuccessAlert: false,
      showRollbackRestoreErrorAlert: false,
      showRollbackRestoreSuccessAlert: false,
      rollbackRestoreError: '',
      restoringRollback: false,
      pendingJsonImport: null,
      exportingDiagnostics: false,
      exportingCss: false,
      cssExportError: '',
      diagnosticsError: '',
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

    pendingJsonImportSummary(): string {
      return this.pendingJsonImport
        ? getImportDiffText(this.pendingJsonImport.diff)
        : '';
    },

    minifyCssExport: {
      get(): boolean {
        return this.$store.state.options?.minifyCssExport ?? false;
      },

      set(value: boolean): void {
        this.$store.dispatch('setOption', {
          name: 'minifyCssExport',
          value,
        });
      },
    },
  },

  created() {
    this.$store.dispatch('getLastStylesRollbackSnapshot');
  },

  methods: {
    exportJson(): void {
      exportAsJSONFile(this.$store.state.styles);
    },

    async exportCss(): Promise<void> {
      this.exportingCss = true;
      this.cssExportError = '';

      try {
        await exportAsCSSFile(
          this.$store.state.styles,
          this.minifyCssExport
        );
      } catch (error) {
        this.cssExportError =
          error instanceof Error ? error.message : 'Unknown error';
      } finally {
        this.exportingCss = false;
      }
    },

    async importJson(): Promise<void> {
      try {
        const preview = await importStylesWithFilePicker(
          this.$store.state.styles
        );
        this.pendingJsonImport = preview;
        this.showImportErrorAlert = false;
        this.showImportSuccessAlert = false;
      } catch (e) {
        this.importError = e;
        this.showImportErrorAlert = true;
        this.showImportSuccessAlert = false;
        reportDiagnostic('import', 'json-preview', e).catch(() => undefined);
      }
    },

    async applyPendingJsonImport(): Promise<void> {
      if (!this.pendingJsonImport) return;

      try {
        await this.$store.dispatch('setAllStyles', {
          styles: this.pendingJsonImport.styles,
          rollbackReason: 'json-import',
        });

        this.pendingJsonImport = null;
        this.showImportErrorAlert = false;
        this.showImportSuccessAlert = true;
      } catch (e) {
        this.importError = e;
        this.showImportErrorAlert = true;
        this.showImportSuccessAlert = false;
        reportDiagnostic('import', 'json-apply', e).catch(() => undefined);
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

    async exportDiagnostics(): Promise<void> {
      this.exportingDiagnostics = true;
      this.diagnosticsError = '';

      try {
        await exportDiagnosticsAsJSONFile();
      } catch (error) {
        this.diagnosticsError =
          error instanceof Error ? error.message : 'Unknown error';
      } finally {
        this.exportingDiagnostics = false;
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

.import-preview-title {
  color: #cdd6f4;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 2px;
}
</style>
