<template>
  <div>
    <b-alert
      v-model="showSyncError"
      variant="danger"
      dismissible
      class="mb-2"
    >
      {{ syncError }}
      <a href="#" class="alert-link ml-2" @click.prevent="syncWithGoogleDrive">
        Retry
      </a>
    </b-alert>

    <b-alert
      v-if="hasSyncConflicts"
      show
      variant="warning"
      class="mb-2"
    >
      <div class="sync-report-title">
        Google Drive resolved {{ syncConflictCount }} conflicting style
        {{ syncConflictCount === 1 ? 'edit' : 'edits' }} by newest modified
        time.
      </div>
      <ul class="sync-conflict-list">
        <li v-for="conflict in syncConflicts" :key="conflict.url">
          <span>{{ conflict.url }}</span>
          <small>
            local {{ conflict.localModifiedTime }} · remote
            {{ conflict.remoteModifiedTime }} · kept {{ conflict.resolvedWith }}
          </small>
        </li>
      </ul>
    </b-alert>

    <b-alert
      v-if="syncedDeletionCount > 0"
      show
      variant="info"
      class="mb-2"
    >
      Applied {{ syncedDeletionCount }} synced
      {{ syncedDeletionCount === 1 ? 'deletion' : 'deletions' }}.
    </b-alert>

    <b-row no-gutters class="description mb-1">
      <div v-if="googleDriveSyncLastModifiedTime && !syncInProgress">
        {{
          t('synced_at_time', [googleDriveSyncLastModifiedTime])
        }}&nbsp;·&nbsp;

        <a :href="googleDriveSyncViewLink" target="_blank">
          {{ t('view_synced_file') }}
        </a>

        &nbsp;·&nbsp;
        <a :href="googleDriveSyncDownloadLink" target="_blank">
          {{ t('download_synced_file') }}
        </a>
      </div>

      <div v-if="googleDriveSyncLastModifiedTime && syncInProgress">
        {{ t('sync_in_progress') }}&nbsp;·&nbsp;
        <a :href="googleDriveSyncViewLink" target="_blank">
          {{ t('view_synced_file') }}
        </a>
        &nbsp;·&nbsp;

        <a :href="googleDriveSyncDownloadLink" target="_blank">
          {{ t('download_synced_file') }}
        </a>
      </div>
    </b-row>

    <b-row v-if="googleDriveSyncEnabled" no-gutters class="description mb-4">
      {{ t('sync_description') }}
    </b-row>

    <b-row no-gutters>
      <app-button
        v-if="googleDriveSyncEnabled"
        class="mr-4"
        variant="primary"
        :disabled="syncInProgress"
        @click="syncWithGoogleDrive"
      >
        <b-icon
          icon="arrow-repeat"
          :animation="syncInProgress ? 'spin' : undefined"
        />

        <span class="pl-2">
          {{ syncInProgress ? t('sync_in_progress') : t('sync_now') }}
        </span>
      </app-button>

      <app-button
        v-if="googleDriveSyncEnabled"
        class="mr-4"
        variant="secondary"
        @click="googleDriveSyncEnabled = false"
      >
        {{ t('disable_google_drive_sync') }}
      </app-button>

      <app-button
        v-if="!googleDriveSyncEnabled"
        class="mr-4"
        variant="primary"
        @click="googleDriveSyncEnabled = true"
      >
        {{ t('enable_google_drive_sync') }}
      </app-button>
    </b-row>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { formatDistanceToNow } from 'date-fns';
import type { StyleSyncConflict } from '@stylekit/types';

import AppButton from '../AppButton.vue';

export default defineComponent({
  name: 'TheGoogleDriveSync',

  components: {
    AppButton,
  },

  data(): {
    syncInProgress: boolean;
    syncError: string;
    showSyncError: boolean;
  } {
    return {
      syncInProgress: false,
      syncError: '',
      showSyncError: false,
    };
  },

  computed: {
    googleDriveSyncEnabled: {
      get(): boolean {
        return this.$store.state.googleDriveSyncEnabled;
      },

      set(val: boolean) {
        this.$store.dispatch('setGoogleDriveSyncEnabled', val);
      },
    },

    googleDriveSyncViewLink(): string {
      if (this.$store.state.googleDriveSyncMetadata) {
        return this.$store.state.googleDriveSyncMetadata.webViewLink;
      }

      return '';
    },

    googleDriveSyncDownloadLink(): string {
      if (this.$store.state.googleDriveSyncMetadata) {
        return this.$store.state.googleDriveSyncMetadata.webContentLink;
      }

      return '';
    },

    googleDriveSyncLastModifiedTime(): string {
      if (this.$store.state.googleDriveSyncMetadata) {
        return formatDistanceToNow(
          new Date(this.$store.state.googleDriveSyncMetadata.modifiedTime),
          { addSuffix: true }
        );
      }

      return '';
    },

    syncConflicts(): StyleSyncConflict[] {
      return this.$store.state.googleDriveSyncReport?.conflicts || [];
    },

    syncConflictCount(): number {
      return this.syncConflicts.length;
    },

    hasSyncConflicts(): boolean {
      return this.syncConflictCount > 0;
    },

    syncedDeletionCount(): number {
      return this.$store.state.googleDriveSyncReport?.tombstonesApplied || 0;
    },
  },

  methods: {
    async syncWithGoogleDrive() {
      this.syncInProgress = true;
      this.showSyncError = false;

      const error = await this.$store.dispatch('syncWithGoogleDrive');

      if (error) {
        this.syncError = error;
        this.showSyncError = true;
      }

      this.syncInProgress = false;
    },
  },
});
</script>

<style lang="scss" scoped>
.description {
  font-size: 15px;
}

.sync-report-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.sync-conflict-list {
  margin: 0;
  padding-left: 18px;

  li {
    margin-bottom: 4px;
  }

  span {
    display: block;
    font-weight: 600;
  }

  small {
    color: #585b70;
  }
}
</style>
