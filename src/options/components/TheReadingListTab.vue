<template>
  <div class="reading-list pt-3">
    <div class="reading-list-heading">
      <div>
        <h2>Reading list</h2>
        <p class="description">
          Text-first snapshots stay available offline and sync through your
          configured Google Drive, WebDAV, or S3 provider.
        </p>
      </div>
      <div class="reading-list-count">
        {{ unreadCount }} unread · {{ items.length }} saved
      </div>
    </div>

    <b-alert v-if="error" show variant="danger" role="alert">
      {{ error }}
    </b-alert>

    <div v-if="selectedItem" class="offline-reader">
      <div class="offline-reader-toolbar">
        <app-button @click="selectedUrl = ''">Back to queue</app-button>
        <div class="offline-reader-actions">
          <app-button @click="openOriginal(selectedItem.url)">
            Open original
          </app-button>
          <app-button @click="toggleRead(selectedItem)">
            {{ selectedItem.readAt ? 'Mark unread' : 'Mark read' }}
          </app-button>
        </div>
      </div>
      <article class="offline-article">
        <a :href="selectedItem.url" target="_blank" rel="noopener noreferrer">
          {{ selectedItem.siteName || hostname(selectedItem.url) }}
        </a>
        <h1>{{ selectedItem.title }}</h1>
        <p v-if="selectedItem.byline" class="offline-byline">
          {{ selectedItem.byline }}
        </p>
        <the-speech-controls :text="selectedItem.textContent" />
        <!-- eslint-disable-next-line vue/no-v-html -- snapshots are allowlist-sanitized before storage -->
        <div class="offline-content" v-html="selectedItem.content" />
      </article>
    </div>

    <div v-else-if="items.length" class="reading-list-items">
      <article
        v-for="item in items"
        :key="item.url"
        class="reading-list-item"
        :class="{ read: item.readAt }"
      >
        <button class="reading-list-open" @click="readOffline(item)">
          <span class="reading-list-site">
            {{ item.siteName || hostname(item.url) }}
          </span>
          <strong>{{ item.title }}</strong>
          <span v-if="item.excerpt" class="reading-list-excerpt">
            {{ item.excerpt }}
          </span>
          <span class="reading-list-date">
            Saved {{ formatDate(item.addedAt) }}
            <span v-if="item.readAt">· read</span>
          </span>
        </button>
        <div class="reading-list-item-actions">
          <app-button @click="toggleRead(item)">
            {{ item.readAt ? 'Unread' : 'Read' }}
          </app-button>
          <app-button @click="remove(item)">Remove</app-button>
        </div>
      </article>
    </div>

    <b-alert v-else-if="!loading" show variant="secondary">
      Your queue is empty. Use “Save page” in the StyleKit popup on any readable
      article.
    </b-alert>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AppButton from './AppButton.vue';
import TheSpeechControls from '../../readability/components/TheSpeechControls.vue';
import type {
  DeleteReadingListItem,
  GetReadingList,
  ReadingListItem,
  ReadingListItemResponse,
  ReadingListResponse,
  SetReadingListItemRead,
} from '@stylekit/types';

export default defineComponent({
  name: 'TheReadingListTab',

  components: { AppButton, TheSpeechControls },

  data(): {
    items: ReadingListItem[];
    selectedUrl: string;
    loading: boolean;
    error: string;
  } {
    return {
      items: [],
      selectedUrl: '',
      loading: true,
      error: '',
    };
  },

  computed: {
    unreadCount(): number {
      return this.items.filter(item => !item.readAt).length;
    },

    selectedItem(): ReadingListItem | undefined {
      return this.items.find(item => item.url === this.selectedUrl);
    },
  },

  async created(): Promise<void> {
    await this.load();
  },

  methods: {
    async load(): Promise<void> {
      this.loading = true;
      const message: GetReadingList = { name: 'GetReadingList' };
      const response = (await chrome.runtime.sendMessage(
        message
      )) as ReadingListResponse;
      this.items = response.items;
      this.error = response.error || '';
      this.loading = false;
    },

    async readOffline(item: ReadingListItem): Promise<void> {
      this.selectedUrl = item.url;
      if (!item.readAt) await this.toggleRead(item);
    },

    async toggleRead(item: ReadingListItem): Promise<void> {
      this.error = '';
      const message: SetReadingListItemRead = {
        name: 'SetReadingListItemRead',
        url: item.url,
        read: !item.readAt,
      };
      const response = (await chrome.runtime.sendMessage(
        message
      )) as ReadingListItemResponse;
      if (!response.item) {
        this.error =
          response.error || 'The reading-list item could not be updated.';
        return;
      }
      this.items = this.items
        .map(current =>
          current.url === response.item?.url ? response.item : current
        )
        .sort((left, right) => {
          if (!!left.readAt !== !!right.readAt) return left.readAt ? 1 : -1;
          return right.addedAt.localeCompare(left.addedAt);
        });
    },

    async remove(item: ReadingListItem): Promise<void> {
      this.error = '';
      const message: DeleteReadingListItem = {
        name: 'DeleteReadingListItem',
        url: item.url,
      };
      const response = (await chrome.runtime.sendMessage(
        message
      )) as ReadingListResponse;
      if (response.error) {
        this.error = response.error;
        return;
      }
      this.items = response.items;
      if (this.selectedUrl === item.url) this.selectedUrl = '';
    },

    openOriginal(url: string): void {
      chrome.tabs.create({ url });
    },

    hostname(url: string): string {
      return new URL(url).hostname;
    },

    formatDate(value: string): string {
      return new Date(value).toLocaleDateString();
    },
  },
});
</script>

<style lang="scss" scoped>
.description {
  color: #a6adc8;
  font-size: 14px;
}

.reading-list-heading,
.offline-reader-toolbar,
.reading-list-item,
.reading-list-item-actions,
.offline-reader-actions {
  display: flex;
  align-items: center;
}

.reading-list-heading,
.offline-reader-toolbar,
.reading-list-item {
  justify-content: space-between;
}

.reading-list-heading {
  gap: 24px;
  margin-bottom: 24px;
}

.reading-list-count,
.reading-list-site,
.reading-list-date {
  color: #a6adc8;
  font-size: 12px;
}

.reading-list-items {
  border: 1px solid #45475a;
  border-radius: 6px;
  overflow: hidden;
}

.reading-list-item {
  gap: 16px;
  padding: 16px;

  & + & {
    border-top: 1px solid #45475a;
  }

  &.read strong,
  &.read .reading-list-excerpt {
    opacity: 0.65;
  }
}

.reading-list-open {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #cdd6f4;
  text-align: left;
}

.reading-list-excerpt {
  display: -webkit-box;
  overflow: hidden;
  color: #bac2de;
  font-size: 13px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.reading-list-item-actions,
.offline-reader-actions {
  flex-shrink: 0;
  gap: 8px;
}

.offline-reader-toolbar {
  margin-bottom: 24px;
}

.offline-article {
  max-width: 680px;
  margin: 0 auto;
  padding: 24px 0 64px;

  h1 {
    margin: 20px 0 8px;
    font-size: 32px;
    line-height: 1.2;
  }
}

.offline-byline {
  color: #a6adc8;
}

.offline-content {
  color: #cdd6f4;
  font-size: 18px;
  line-height: 1.7;

  :deep(a) {
    color: #89b4fa;
  }

  :deep(pre) {
    overflow-x: auto;
    padding: 12px;
    background: #181825;
  }
}
</style>
