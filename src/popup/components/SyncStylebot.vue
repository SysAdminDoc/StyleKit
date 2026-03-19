<template>
  <b-list-group-item
    button
    :title="t('sync_description')"
    :disabled="syncInProgress"
    @click="sync"
  >
    <b-icon
      icon="arrow-repeat"
      :animation="syncInProgress ? 'spin' : undefined"
    />

    <span class="pl-2">
      {{ syncInProgress ? t('sync_in_progress') : t('sync_now') }}

      <span class="sync-metadata pl-1">
        {{ syncInProgress ? undefined : syncTime }}
      </span>
    </span>
  </b-list-group-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { formatDistanceToNow } from 'date-fns';

import { getGoogleDriveSyncMetadata } from '@stylekit/sync';
import { RunGoogleDriveSync } from '@stylekit/types';

export default defineComponent({
  name: 'SyncStylebot',

  data(): {
    syncTime: string;
    syncInProgress: boolean;
  } {
    return {
      syncTime: '',
      syncInProgress: false,
    };
  },

  created() {
    this.updateSyncTime();
  },

  methods: {
    async updateSyncTime() {
      const googleDriveSyncMetadata = await getGoogleDriveSyncMetadata();

      if (googleDriveSyncMetadata) {
        this.syncTime = formatDistanceToNow(
          new Date(googleDriveSyncMetadata.modifiedTime),
          { addSuffix: true }
        );
      }
    },

    sync() {
      const message: RunGoogleDriveSync = {
        name: 'RunGoogleDriveSync',
      };

      this.syncInProgress = true;

      try {
        chrome.runtime.sendMessage(message, () => {
          if (chrome.runtime.lastError) {
            console.warn('StyleKit: sync failed', chrome.runtime.lastError);
          }
          this.updateSyncTime();
          this.syncInProgress = false;
        });
      } catch {
        this.syncInProgress = false;
      }

      // Safety timeout: unlock UI if callback never fires
      setTimeout(() => {
        if (this.syncInProgress) {
          this.syncInProgress = false;
        }
      }, 30000);
    },
  },
});
</script>

<style lang="scss">
.sync-metadata {
  color: #777;
  font-size: 12px;
  font-style: italic;
}
</style>
