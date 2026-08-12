<template>
  <div class="collaborative-packs">
    <div class="description mb-3">
      Yjs merges concurrent CSS edits without replacing a teammate's whole
      pack. Exchange update files through a trusted channel; StyleKit does not
      contact a collaboration server.
    </div>

    <div v-if="error" class="collaboration-error mb-2" role="alert">
      {{ error }}
    </div>
    <div v-if="status" class="collaboration-status mb-2" role="status">
      {{ status }}
    </div>

    <div class="create-pack-row mb-3">
      <b-form-input
        v-model="packName"
        size="sm"
        aria-label="Collaborative pack name"
        placeholder="Shared design pack"
        maxlength="80"
        @keyup.enter="createPack"
      />
      <app-button
        size="sm"
        variant="primary"
        :disabled="busy || !packName.trim()"
        @click="createPack"
      >
        Create from current styles
      </app-button>
      <app-button size="sm" :disabled="busy" @click="pickUpdateFile">
        Import teammate update
      </app-button>
    </div>

    <div v-if="!busy && packs.length === 0" class="description mb-2">
      No collaborative packs yet.
    </div>

    <div v-for="pack in packs" :key="pack.id" class="pack-card mb-2">
      <div class="pack-summary">
        <strong>{{ pack.name }}</strong>
        <span>
          {{ pack.styleCount }} {{ pack.styleCount === 1 ? 'style' : 'styles' }}
          · updated {{ formatTimestamp(pack.updatedAt) }}
        </span>
        <code :title="pack.stateVector">
          state {{ pack.stateVector.slice(0, 16) }}…
        </code>
      </div>
      <div class="pack-actions">
        <app-button size="sm" :disabled="busy" @click="capturePack(pack.id)">
          Capture current
        </app-button>
        <app-button size="sm" :disabled="busy" @click="downloadPack(pack)">
          Export update
        </app-button>
        <app-button
          size="sm"
          variant="primary"
          :disabled="busy"
          @click="applyPack(pack.id)"
        >
          Apply merged styles
        </app-button>
        <app-button size="sm" :disabled="busy" @click="removePack(pack)">
          {{ deleteConfirmId === pack.id ? 'Confirm delete' : 'Delete' }}
        </app-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type {
  CollaborativePackSummary,
  CollaborativePackUpdateEnvelope,
} from '@stylekit/types';
import AppButton from '../AppButton.vue';
import {
  applyCollaborativePack,
  captureCollaborativePack,
  createCollaborativePack,
  deleteCollaborativePack,
  exportCollaborativePack,
  getCollaborativePacks,
  importCollaborativePack,
} from '../../utils';

const pickJsonFile = (): Promise<CollaborativePackUpdateEnvelope> =>
  new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) throw new Error('No update file selected');
        if (file.size > 7 * 1024 * 1024) {
          throw new Error('Collaborative update file exceeds 7 MB');
        }
        resolve(JSON.parse(await file.text()) as CollaborativePackUpdateEnvelope);
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });

const safeFilename = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
  'shared-pack';

export default defineComponent({
  name: 'TheCollaborativePacks',

  components: { AppButton },

  data(): {
    packs: CollaborativePackSummary[];
    packName: string;
    busy: boolean;
    error: string;
    status: string;
    deleteConfirmId: string | null;
  } {
    return {
      packs: [],
      packName: '',
      busy: true,
      error: '',
      status: '',
      deleteConfirmId: null,
    };
  },

  created() {
    void this.loadPacks();
  },

  methods: {
    async run(
      operation: () => Promise<CollaborativePackSummary[]>,
      success: string
    ): Promise<void> {
      this.busy = true;
      this.error = '';
      try {
        this.packs = await operation();
        this.status = success;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      } finally {
        this.busy = false;
      }
    },

    async loadPacks(): Promise<void> {
      await this.run(getCollaborativePacks, '');
    },

    async createPack(): Promise<void> {
      const name = this.packName;
      await this.run(
        () => createCollaborativePack(name),
        'Collaborative pack created from current styles.'
      );
      if (!this.error) this.packName = '';
    },

    async capturePack(id: string): Promise<void> {
      await this.run(
        () => captureCollaborativePack(id),
        'Current edits captured as a CRDT update.'
      );
    },

    async downloadPack(pack: CollaborativePackSummary): Promise<void> {
      this.busy = true;
      this.error = '';
      try {
        const envelope = await exportCollaborativePack(pack.id);
        const blob = new Blob([JSON.stringify(envelope, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `stylekit-collab-${safeFilename(pack.name)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        this.status = 'CRDT update exported for sharing.';
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      } finally {
        this.busy = false;
      }
    },

    async pickUpdateFile(): Promise<void> {
      try {
        const envelope = await pickJsonFile();
        await this.run(
          () => importCollaborativePack(envelope),
          'Teammate update merged without replacing concurrent edits.'
        );
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      }
    },

    async applyPack(id: string): Promise<void> {
      await this.run(
        () => applyCollaborativePack(id),
        'Merged pack applied. A rollback snapshot is available.'
      );
      if (!this.error) await this.$store.dispatch('getAllStyles');
    },

    async removePack(pack: CollaborativePackSummary): Promise<void> {
      if (this.deleteConfirmId !== pack.id) {
        this.deleteConfirmId = pack.id;
        return;
      }
      this.deleteConfirmId = null;
      await this.run(
        () => deleteCollaborativePack(pack.id),
        'Collaborative pack deleted.'
      );
    },

    formatTimestamp(timestamp: string): string {
      return new Date(timestamp).toLocaleString();
    },
  },
});
</script>

<style lang="scss" scoped>
.description {
  color: #585b70;
  font-size: 14px;
}

.create-pack-row,
.pack-actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.create-pack-row .form-control {
  max-width: 260px;
}

.pack-card {
  align-items: center;
  border: 1px solid #d9dce3;
  border-radius: 8px;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 12px;
}

.pack-summary {
  display: flex;
  flex-direction: column;
  min-width: 180px;

  span,
  code {
    color: #585b70;
    font-size: 12px;
  }
}

.collaboration-error {
  color: #d20f39;
}

.collaboration-status {
  color: #287a3d;
}
</style>
