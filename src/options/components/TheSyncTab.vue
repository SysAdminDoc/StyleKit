<template>
  <div class="pt-3">
    <b-alert v-model="showImportSuccessAlert" variant="success" dismissible>
      {{ t('import_success') }}
    </b-alert>

    <b-alert v-model="showImportErrorAlert" variant="danger" dismissible>
      {{ t('import_error', [importError]) }}
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
    importError: string | DOMException | null;
  } {
    return {
      importError: null,
      showImportErrorAlert: false,
      showImportSuccessAlert: false,
    };
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
        this.$store.dispatch('setAllStyles', styles);

        this.showImportErrorAlert = false;
        this.showImportSuccessAlert = true;
      } catch (e) {
        this.importError = e;
        this.showImportErrorAlert = true;
        this.showImportSuccessAlert = false;
      }
    },
  },
});
</script>

<style lang="scss" scoped>
.description {
  font-size: 14px;
}
</style>
