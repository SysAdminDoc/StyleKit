<template>
  <div class="remote-sync-providers">
    <div class="description mb-3">
      Sync the same versioned style/tombstone file through an exact WebDAV or
      S3 object URL. Credentials stay in this browser's extension storage.
      HTTPS is required except for loopback development servers.
    </div>

    <section class="provider-card mb-3" aria-labelledby="webdav-sync-title">
      <h3 id="webdav-sync-title">WebDAV</h3>
      <div class="description mb-2">
        Point to a JSON file whose parent collection already exists.
      </div>
      <div class="provider-fields">
        <b-form-input
          v-model="webdav.url"
          size="sm"
          type="url"
          aria-label="WebDAV object URL"
          placeholder="https://dav.example.com/backups/stylekit.json"
          autocomplete="url"
        />
        <b-form-input
          v-model="webdav.username"
          size="sm"
          aria-label="WebDAV username"
          placeholder="Username (optional)"
          autocomplete="username"
        />
        <b-form-input
          v-model="webdav.password"
          size="sm"
          type="password"
          aria-label="WebDAV password"
          placeholder="Password or app password (optional)"
          autocomplete="new-password"
        />
      </div>
      <div class="provider-actions mt-2">
        <app-button
          size="sm"
          :disabled="busyProvider === 'webdav'"
          @click="saveWebDav"
        >
          {{ busyProvider === 'webdav' ? 'Working...' : 'Save credentials' }}
        </app-button>
        <app-button
          size="sm"
          variant="primary"
          :disabled="busyProvider === 'webdav' || !configured.webdav"
          @click="sync('webdav')"
        >
          Sync now
        </app-button>
        <app-button
          v-if="configured.webdav"
          size="sm"
          :disabled="busyProvider === 'webdav'"
          @click="forget('webdav')"
        >
          {{
            deleteConfirm === 'webdav'
              ? 'Confirm forget'
              : 'Forget credentials'
          }}
        </app-button>
      </div>
      <div v-if="status.webdav" class="provider-status mt-2" role="status">
        {{ status.webdav }}
      </div>
      <div v-if="errors.webdav" class="provider-error mt-2" role="alert">
        {{ errors.webdav }}
      </div>
      <div v-if="lastSynced('webdav')" class="description mt-1">
        Last synced {{ lastSynced('webdav') }}
      </div>
    </section>

    <section class="provider-card" aria-labelledby="s3-sync-title">
      <h3 id="s3-sync-title">Amazon S3 / S3-compatible</h3>
      <div class="description mb-2">
        Use the exact virtual-hosted or path-style object URL. Requests use
        AWS Signature Version 4 with a signed payload.
      </div>
      <div class="provider-fields">
        <b-form-input
          v-model="s3.url"
          size="sm"
          type="url"
          aria-label="S3 object URL"
          placeholder="https://bucket.s3.us-east-1.amazonaws.com/stylekit.json"
          autocomplete="url"
        />
        <b-form-input
          v-model="s3.region"
          size="sm"
          aria-label="S3 region"
          placeholder="us-east-1"
          autocomplete="off"
        />
        <b-form-input
          v-model="s3.accessKeyId"
          size="sm"
          aria-label="S3 access key ID"
          placeholder="Access key ID"
          autocomplete="username"
        />
        <b-form-input
          v-model="s3.secretAccessKey"
          size="sm"
          type="password"
          aria-label="S3 secret access key"
          placeholder="Secret access key"
          autocomplete="new-password"
        />
        <b-form-input
          v-model="s3.sessionToken"
          size="sm"
          type="password"
          aria-label="S3 session token"
          placeholder="Session token (optional)"
          autocomplete="new-password"
        />
      </div>
      <div class="provider-actions mt-2">
        <app-button
          size="sm"
          :disabled="busyProvider === 's3'"
          @click="saveS3"
        >
          {{ busyProvider === 's3' ? 'Working...' : 'Save credentials' }}
        </app-button>
        <app-button
          size="sm"
          variant="primary"
          :disabled="busyProvider === 's3' || !configured.s3"
          @click="sync('s3')"
        >
          Sync now
        </app-button>
        <app-button
          v-if="configured.s3"
          size="sm"
          :disabled="busyProvider === 's3'"
          @click="forget('s3')"
        >
          {{
            deleteConfirm === 's3'
              ? 'Confirm forget'
              : 'Forget credentials'
          }}
        </app-button>
      </div>
      <div v-if="status.s3" class="provider-status mt-2" role="status">
        {{ status.s3 }}
      </div>
      <div v-if="errors.s3" class="provider-error mt-2" role="alert">
        {{ errors.s3 }}
      </div>
      <div v-if="lastSynced('s3')" class="description mt-1">
        Last synced {{ lastSynced('s3') }}
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type {
  RemoteSyncMetadata,
  RemoteSyncProvider,
  RemoteSyncSettings,
  S3SyncConfig,
  WebDavSyncConfig,
} from '@stylekit/types';
import AppButton from '../AppButton.vue';
import {
  deleteRemoteSyncConfig,
  getRemoteSyncSettings,
  runRemoteSync,
  saveRemoteSyncConfig,
} from '../../utils';

type ProviderMap<T> = Record<RemoteSyncProvider, T>;

const emptyWebDav = (): WebDavSyncConfig => ({
  provider: 'webdav',
  url: '',
  username: '',
  password: '',
});

const emptyS3 = (): S3SyncConfig => ({
  provider: 's3',
  url: '',
  region: 'us-east-1',
  accessKeyId: '',
  secretAccessKey: '',
  sessionToken: '',
});

export default defineComponent({
  name: 'TheRemoteSyncProviders',
  components: { AppButton },

  data(): {
    webdav: WebDavSyncConfig;
    s3: S3SyncConfig;
    metadata: Partial<Record<RemoteSyncProvider, RemoteSyncMetadata>>;
    configured: ProviderMap<boolean>;
    status: ProviderMap<string>;
    errors: ProviderMap<string>;
    busyProvider: RemoteSyncProvider | null;
    deleteConfirm: RemoteSyncProvider | null;
  } {
    return {
      webdav: emptyWebDav(),
      s3: emptyS3(),
      metadata: {},
      configured: { webdav: false, s3: false },
      status: { webdav: '', s3: '' },
      errors: { webdav: '', s3: '' },
      busyProvider: null,
      deleteConfirm: null,
    };
  },

  created() {
    void this.load();
  },

  methods: {
    applySettings(settings: RemoteSyncSettings): void {
      this.metadata = settings.metadata;
      this.configured.webdav = Boolean(settings.configs.webdav);
      this.configured.s3 = Boolean(settings.configs.s3);
      if (settings.configs.webdav?.provider === 'webdav') {
        this.webdav = { ...settings.configs.webdav };
      }
      if (settings.configs.s3?.provider === 's3') {
        this.s3 = { ...settings.configs.s3 };
      }
    },

    async load(): Promise<void> {
      try {
        this.applySettings(await getRemoteSyncSettings());
      } catch (error) {
        this.errors.webdav =
          error instanceof Error ? error.message : String(error);
      }
    },

    async saveWebDav(): Promise<void> {
      await this.save('webdav', this.webdav);
    },

    async saveS3(): Promise<void> {
      await this.save('s3', this.s3);
    },

    async save(
      provider: RemoteSyncProvider,
      config: WebDavSyncConfig | S3SyncConfig
    ): Promise<void> {
      this.busyProvider = provider;
      this.errors[provider] = '';
      try {
        this.applySettings(await saveRemoteSyncConfig(config));
        this.status[provider] = 'Credentials saved locally.';
      } catch (error) {
        this.errors[provider] =
          error instanceof Error ? error.message : String(error);
      } finally {
        this.busyProvider = null;
      }
    },

    async sync(provider: RemoteSyncProvider): Promise<void> {
      this.busyProvider = provider;
      this.errors[provider] = '';
      this.status[provider] = '';
      try {
        const result = await runRemoteSync(provider);
        this.metadata[provider] = {
          provider,
          lastSyncedAt: result.syncedAt,
        };
        const parts = [
          result.remoteCreated ? 'Remote backup created.' : 'Sync complete.',
        ];
        if (result.conflicts.length) {
          parts.push(`${result.conflicts.length} conflicts resolved by newest edit.`);
        }
        if (result.tombstonesApplied) {
          parts.push(`${result.tombstonesApplied} deletions applied.`);
        }
        this.status[provider] = parts.join(' ');
        if (result.localChanged) await this.$store.dispatch('getAllStyles');
      } catch (error) {
        this.errors[provider] =
          error instanceof Error ? error.message : String(error);
      } finally {
        this.busyProvider = null;
      }
    },

    async forget(provider: RemoteSyncProvider): Promise<void> {
      if (this.deleteConfirm !== provider) {
        this.deleteConfirm = provider;
        return;
      }
      this.deleteConfirm = null;
      this.busyProvider = provider;
      this.errors[provider] = '';
      try {
        this.applySettings(await deleteRemoteSyncConfig(provider));
        if (provider === 'webdav') this.webdav = emptyWebDav();
        else this.s3 = emptyS3();
        this.status[provider] = 'Credentials removed from local storage.';
      } catch (error) {
        this.errors[provider] =
          error instanceof Error ? error.message : String(error);
      } finally {
        this.busyProvider = null;
      }
    },

    lastSynced(provider: RemoteSyncProvider): string {
      const value = this.metadata[provider]?.lastSyncedAt;
      return value ? new Date(value).toLocaleString() : '';
    },
  },
});
</script>

<style lang="scss" scoped>
.description {
  color: #585b70;
  font-size: 14px;
}

.provider-card {
  border: 1px solid #d9dce3;
  border-radius: 8px;
  padding: 12px;
}

h3 {
  font-size: 16px;
  margin-bottom: 4px;
}

.provider-fields {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
}

.provider-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.provider-status {
  color: #287a3d;
  font-size: 13px;
}

.provider-error {
  color: #d20f39;
  font-size: 13px;
}
</style>
