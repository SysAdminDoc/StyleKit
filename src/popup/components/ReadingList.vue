<template>
  <b-list-group-item class="reading-list-row">
    <div class="reading-list-copy">
      <div class="reading-list-title">Read later</div>
      <div v-if="status" class="reading-list-status" role="status">
        {{ status }}
      </div>
    </div>
    <div class="reading-list-actions">
      <button
        class="reading-list-button"
        :disabled="!canCapture || saving || saved"
        @click="capture"
      >
        {{ saving ? 'Saving…' : saved ? 'Saved' : 'Save page' }}
      </button>
      <button class="reading-list-button" @click="openReadingList">
        Open
        <span v-if="count">({{ count }})</span>
      </button>
    </div>
  </b-list-group-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import type {
  CaptureReadingListArticle,
  GetReadingList,
  ReadingListCaptureResponse,
  ReadingListItemResponse,
  ReadingListResponse,
  SaveReadingListItem,
} from '@stylekit/types';

const normalizeUrl = (value?: string): string | null => {
  try {
    if (!value) return null;
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
};

export default defineComponent({
  name: 'ReadingList',

  props: {
    tab: {
      type: Object,
      required: true,
    },
  },

  data(): {
    count: number;
    saved: boolean;
    saving: boolean;
    status: string;
  } {
    return {
      count: 0,
      saved: false,
      saving: false,
      status: '',
    };
  },

  computed: {
    canCapture(): boolean {
      return Boolean(normalizeUrl((this.tab as chrome.tabs.Tab).url));
    },
  },

  async created(): Promise<void> {
    const message: GetReadingList = { name: 'GetReadingList' };
    const response = (await chrome.runtime.sendMessage(
      message
    )) as ReadingListResponse;
    this.count = response.items.length;
    const currentUrl = normalizeUrl((this.tab as chrome.tabs.Tab).url);
    this.saved = response.items.some(item => item.url === currentUrl);
  },

  methods: {
    async capture(): Promise<void> {
      const tab = this.tab as chrome.tabs.Tab;
      if (!tab.id || !this.canCapture) return;
      this.saving = true;
      this.status = '';
      try {
        const message: CaptureReadingListArticle = {
          name: 'CaptureReadingListArticle',
        };
        const captureResponse = (await chrome.tabs.sendMessage(
          tab.id,
          message
        )) as ReadingListCaptureResponse;
        if (!captureResponse?.item) {
          throw new Error(
            captureResponse?.error || 'This page is not readable.'
          );
        }
        const saveMessage: SaveReadingListItem = {
          name: 'SaveReadingListItem',
          item: captureResponse.item,
        };
        const response = (await chrome.runtime.sendMessage(
          saveMessage
        )) as ReadingListItemResponse;
        if (!response.item) throw new Error(response.error || 'Save failed.');
        this.saved = true;
        this.count += 1;
        this.status = 'Offline copy saved.';
      } catch (error) {
        this.status =
          error instanceof Error
            ? error.message
            : 'This page could not be saved.';
      } finally {
        this.saving = false;
      }
    },

    openReadingList(): void {
      chrome.tabs.create({
        url: chrome.runtime.getURL('options/index.html#reading-list'),
      });
      window.close();
    },
  },
});
</script>

<style lang="scss" scoped>
.reading-list-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.reading-list-title {
  font-size: 14px;
  font-weight: 600;
}

.reading-list-status {
  max-width: 150px;
  color: #6c7086;
  font-size: 11px;
  line-height: 1.2;
}

.reading-list-actions {
  display: flex;
  gap: 6px;
}

.reading-list-button {
  border: 1px solid #45475a;
  border-radius: 4px;
  background: #313244;
  color: #cdd6f4;
  cursor: pointer;
  font-size: 11px;
  padding: 4px 8px;

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
}
</style>
