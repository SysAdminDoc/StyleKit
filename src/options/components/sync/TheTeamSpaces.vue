<template>
  <div class="team-spaces">
    <div class="description mb-3">
      Organize collaborative packs by author. Owners manage members, editors
      capture and publish updates, and viewers can only apply merged styles.
      Exchange invitations and updates through a trusted channel.
    </div>

    <div v-if="error" class="team-error mb-2" role="alert">{{ error }}</div>
    <div v-if="status" class="team-status mb-2" role="status">
      {{ status }}
    </div>

    <div class="team-create mb-3">
      <b-form-input
        v-model="spaceName"
        size="sm"
        aria-label="Team space name"
        placeholder="Design team"
        maxlength="80"
      />
      <b-form-input
        v-model="ownerName"
        size="sm"
        aria-label="Team owner name"
        placeholder="Your name"
        maxlength="80"
      />
      <app-button
        size="sm"
        variant="primary"
        :disabled="busy || !spaceName.trim() || !ownerName.trim()"
        @click="createSpace"
      >
        Create team space
      </app-button>
      <app-button size="sm" :disabled="busy" @click="pickTeamFile">
        Import invitation/update
      </app-button>
    </div>

    <div v-if="!busy && spaces.length === 0" class="description">
      No team spaces yet.
    </div>

    <div v-for="space in spaces" :key="space.id" class="team-card mb-3">
      <div class="team-heading">
        <div>
          <strong>{{ space.name }}</strong>
          <span>
            {{ space.styleCount }} styles · acting as {{ currentName(space) }}
            ({{ space.currentRole }})
          </span>
        </div>
        <div class="team-actions">
          <app-button
            size="sm"
            :disabled="busy || space.currentRole === 'viewer'"
            @click="mutate(space.id, { type: 'capture' }, 'Team edits captured.')"
          >
            Capture current
          </app-button>
          <app-button
            size="sm"
            :disabled="busy || space.currentRole === 'viewer'"
            @click="downloadUpdate(space)"
          >
            Export update
          </app-button>
          <app-button
            size="sm"
            variant="primary"
            :disabled="busy"
            @click="applySpace(space.id)"
          >
            Apply team styles
          </app-button>
          <app-button
            v-if="space.currentRole === 'owner'"
            size="sm"
            :disabled="busy"
            @click="deleteSpace(space)"
          >
            {{ deleteConfirmId === space.id ? 'Confirm delete' : 'Delete space' }}
          </app-button>
        </div>
      </div>

      <div class="member-list">
        <div v-for="member in space.members" :key="member.id" class="member-row">
          <span>
            {{ member.name }}
            <small v-if="member.id === space.currentMemberId">this device</small>
          </span>
          <select
            :value="member.role"
            :disabled="busy || space.currentRole !== 'owner'"
            :aria-label="`Role for ${member.name}`"
            @change="setRole(space.id, member.id, $event)"
          >
            <option value="owner">Owner</option>
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <app-button
            v-if="space.currentRole === 'owner' && member.id !== space.currentMemberId"
            size="sm"
            :disabled="busy"
            @click="downloadInvite(space, member)"
          >
            Export invite
          </app-button>
          <app-button
            v-if="space.currentRole === 'owner' && member.id !== space.currentMemberId"
            size="sm"
            :disabled="busy"
            @click="mutate(space.id, { type: 'remove-member', memberId: member.id }, 'Member removed.')"
          >
            Remove
          </app-button>
        </div>
      </div>

      <div v-if="space.currentRole === 'owner'" class="member-add mt-2">
        <input
          v-model="memberDrafts[space.id].name"
          :aria-label="`New member for ${space.name}`"
          placeholder="Member name"
          maxlength="80"
        />
        <select
          v-model="memberDrafts[space.id].role"
          :aria-label="`New member role for ${space.name}`"
        >
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
          <option value="owner">Owner</option>
        </select>
        <app-button
          size="sm"
          :disabled="busy || !memberDrafts[space.id].name.trim()"
          @click="addMember(space.id)"
        >
          Add member
        </app-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type {
  TeamSpaceMember,
  TeamSpaceMutation,
  TeamSpaceRole,
  TeamSpaceSummary,
  TeamSpaceUpdateEnvelope,
} from '@stylekit/types';
import AppButton from '../AppButton.vue';
import {
  createTeamSpace,
  exportTeamSpace,
  getTeamSpaces,
  importTeamSpace,
  mutateTeamSpace,
} from '../../utils';

type MemberDraft = { name: string; role: TeamSpaceRole };

const pickJsonFile = (): Promise<TeamSpaceUpdateEnvelope> =>
  new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      try {
        const file = input.files?.[0];
        if (!file) throw new Error('No team file selected');
        if (file.size > 7 * 1024 * 1024) {
          throw new Error('Team update file exceeds 7 MB');
        }
        resolve(JSON.parse(await file.text()) as TeamSpaceUpdateEnvelope);
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });

const slug = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
  'team-space';

export default defineComponent({
  name: 'TheTeamSpaces',
  components: { AppButton },

  data(): {
    spaces: TeamSpaceSummary[];
    memberDrafts: Record<string, MemberDraft>;
    spaceName: string;
    ownerName: string;
    busy: boolean;
    error: string;
    status: string;
    deleteConfirmId: string | null;
  } {
    return {
      spaces: [],
      memberDrafts: {},
      spaceName: '',
      ownerName: '',
      busy: true,
      error: '',
      status: '',
      deleteConfirmId: null,
    };
  },

  created() {
    void this.loadSpaces();
  },

  methods: {
    setSpaces(spaces: TeamSpaceSummary[]): void {
      this.spaces = spaces;
      for (const space of spaces) {
        this.memberDrafts[space.id] ||= { name: '', role: 'editor' };
      }
    },

    async run(
      operation: () => Promise<TeamSpaceSummary[]>,
      success = ''
    ): Promise<void> {
      this.busy = true;
      this.error = '';
      try {
        this.setSpaces(await operation());
        this.status = success;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      } finally {
        this.busy = false;
      }
    },

    async loadSpaces(): Promise<void> {
      await this.run(getTeamSpaces);
    },

    async createSpace(): Promise<void> {
      await this.run(
        () => createTeamSpace(this.spaceName, this.ownerName),
        'Team space created with owner permissions.'
      );
      if (!this.error) {
        this.spaceName = '';
        this.ownerName = '';
      }
    },

    async mutate(
      id: string,
      mutation: TeamSpaceMutation,
      success: string
    ): Promise<void> {
      await this.run(() => mutateTeamSpace(id, mutation), success);
    },

    async applySpace(id: string): Promise<void> {
      await this.mutate(
        id,
        { type: 'apply' },
        'Team styles applied with rollback protection.'
      );
      if (!this.error) await this.$store.dispatch('getAllStyles');
    },

    async addMember(id: string): Promise<void> {
      const draft = this.memberDrafts[id];
      await this.mutate(
        id,
        { type: 'add-member', name: draft.name, role: draft.role },
        `${draft.name} added as ${draft.role}.`
      );
      if (!this.error) draft.name = '';
    },

    async setRole(id: string, memberId: string, event: Event): Promise<void> {
      const role = (event.target as HTMLSelectElement).value as TeamSpaceRole;
      await this.mutate(
        id,
        { type: 'set-role', memberId, role },
        `Member role changed to ${role}.`
      );
    },

    async download(
      space: TeamSpaceSummary,
      recipient?: TeamSpaceMember
    ): Promise<void> {
      this.busy = true;
      this.error = '';
      try {
        const envelope = await exportTeamSpace(space.id, recipient?.id);
        const blob = new Blob([JSON.stringify(envelope, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = recipient
          ? `stylekit-team-invite-${slug(space.name)}-${slug(recipient.name)}.json`
          : `stylekit-team-update-${slug(space.name)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        this.status = recipient
          ? `Invitation exported for ${recipient.name}.`
          : 'Team update exported.';
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      } finally {
        this.busy = false;
      }
    },

    downloadUpdate(space: TeamSpaceSummary): Promise<void> {
      return this.download(space);
    },

    downloadInvite(
      space: TeamSpaceSummary,
      member: TeamSpaceMember
    ): Promise<void> {
      return this.download(space, member);
    },

    async pickTeamFile(): Promise<void> {
      try {
        const envelope = await pickJsonFile();
        await this.run(
          () => importTeamSpace(envelope),
          'Team invitation/update imported and merged.'
        );
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
      }
    },

    async deleteSpace(space: TeamSpaceSummary): Promise<void> {
      if (this.deleteConfirmId !== space.id) {
        this.deleteConfirmId = space.id;
        return;
      }
      this.deleteConfirmId = null;
      await this.mutate(
        space.id,
        { type: 'delete' },
        'Team space and its collaborative pack were deleted.'
      );
    },

    currentName(space: TeamSpaceSummary): string {
      return (
        space.members.find(member => member.id === space.currentMemberId)?.name ||
        'unknown member'
      );
    },
  },
});
</script>

<style lang="scss" scoped>
.description {
  color: #585b70;
  font-size: 14px;
}

.team-create,
.team-actions,
.member-add,
.member-row,
.team-heading {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.team-create .form-control,
.member-add input {
  max-width: 220px;
}

.team-card {
  border: 1px solid #d9dce3;
  border-radius: 8px;
  padding: 12px;
}

.team-heading {
  justify-content: space-between;

  > div:first-child {
    display: flex;
    flex-direction: column;
  }

  span {
    color: #585b70;
    font-size: 12px;
  }
}

.member-list {
  border-top: 1px solid #eceef2;
  margin-top: 10px;
  padding-top: 8px;
}

.member-row {
  margin-bottom: 6px;

  > span {
    min-width: 180px;
  }

  small {
    color: #287a3d;
  }
}

.team-error {
  color: #d20f39;
}

.team-status {
  color: #287a3d;
}
</style>
