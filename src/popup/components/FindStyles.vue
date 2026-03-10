<template>
  <div>
    <b-list-group-item button class="find-styles-btn" @click="toggleSearch">
      <b-icon icon="search" />
      <span class="pl-2">{{ t('find_styles') }}</span>
    </b-list-group-item>

    <div v-if="showSearch" class="find-styles-panel">
      <div v-if="loading" class="find-styles-status">
        <div class="find-styles-spinner"></div>
        <span>{{ t('loading_styles') }}</span>
      </div>

      <div v-else-if="error" class="find-styles-status find-styles-error">
        {{ t('style_search_error') }}
      </div>

      <div v-else-if="results.length === 0" class="find-styles-status">
        {{ t('no_styles_found') }}
      </div>

      <div v-else class="find-styles-results">
        <div
          v-for="style in results"
          :key="style.i"
          class="find-style-item"
          :class="{
            'is-installed': installedIds.has(style.i),
            'is-previewing': previewingId === style.i,
          }"
        >
          <img
            class="find-style-thumb"
            :src="thumbnails[style.i] || ''"
            alt=""
          />
          <div class="find-style-body">
            <div class="find-style-info">
              <a
                class="find-style-name"
                :href="getStyleUrl(style)"
                target="_blank"
                :title="style.n"
              >
                {{ truncate(style.n, 36) }}
              </a>
              <div class="find-style-meta">
                <span class="find-style-author">{{ style.an }}</span>
                <span v-if="style.w" class="find-style-installs">
                  {{ formatNumber(style.w) }}/wk
                </span>
              </div>
            </div>
            <div class="find-style-actions">
              <!-- Preview -->
              <button
                class="find-style-btn preview-btn"
                :class="{ active: previewingId === style.i }"
                :disabled="busyIds.has(style.i)"
                :title="previewingId === style.i ? t('stop_preview') : t('preview')"
                @click="togglePreview(style)"
              >
                &#x25B6;
              </button>

              <!-- Install -->
              <button
                v-if="!installedIds.has(style.i)"
                class="find-style-btn install-btn"
                :disabled="busyIds.has(style.i)"
                :title="t('install')"
                @click="installStyle(style)"
              >
                <span v-if="installingIds.has(style.i)" class="find-style-spinner-sm"></span>
                <template v-else>+</template>
              </button>

              <!-- Edit (only shown when installed) -->
              <button
                v-if="installedIds.has(style.i)"
                class="find-style-btn edit-btn"
                :title="t('edit_style')"
                @click="editStyle(style)"
              >
                &#x270E;
              </button>

              <!-- Delete (only shown when installed) -->
              <button
                v-if="installedIds.has(style.i)"
                class="find-style-btn delete-btn"
                :title="t('delete_style')"
                @click="deleteStyle(style)"
              >
                &#x2715;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import {
  SetStyle,
  ToggleStylebot,
} from '@stylebot/types';
import { convertUserCssToRaw } from '../../utils/usercss';

interface UserstyleEntry {
  i: number;
  n: string;
  c: string;
  u: number;
  t: number;
  w: number;
  r: number;
  ai: number;
  an: string;
  sn: string;
  sa: boolean;
  source: 'usw' | 'usoa';
}

export default Vue.extend({
  name: 'FindStyles',

  props: {
    tab: {
      type: Object,
      default: undefined,
    },
  },

  data(): {
    showSearch: boolean;
    loading: boolean;
    error: boolean;
    results: UserstyleEntry[];
    installingIds: Set<number>;
    installedIds: Set<number>;
    busyIds: Set<number>;
    previewingId: number | null;
    previewCssCache: Map<number, string>;
    thumbnails: Record<number, string>;
    domain: string;
  } {
    return {
      showSearch: false,
      loading: false,
      error: false,
      results: [],
      installingIds: new Set(),
      installedIds: new Set(),
      busyIds: new Set(),
      previewingId: null,
      previewCssCache: new Map(),
      thumbnails: {},
      domain: '',
    };
  },

  methods: {
    toggleSearch(): void {
      this.showSearch = !this.showSearch;
      if (this.showSearch && this.results.length === 0) {
        this.search();
      }
    },

    getDomain(): string {
      if (!this.tab?.url) return '';
      try {
        return new URL(this.tab.url).hostname;
      } catch {
        return '';
      }
    },

    async search(): Promise<void> {
      this.domain = this.getDomain();
      if (!this.domain) {
        this.error = true;
        return;
      }

      this.loading = true;
      this.error = false;

      try {
        const res = await fetch(
          'https://userstyles.world/api/index/uso-format'
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const index: UserstyleEntry[] = (json.data || []).map(
          (e: any) => ({ ...e, source: 'usw' as const })
        );

        const domain = this.domain;
        this.results = index
          .filter((entry: UserstyleEntry) => {
            const cat = (entry.c || '').toLowerCase();
            const dom = domain.toLowerCase();
            if (!cat) return false;
            if (cat === dom) return true;
            if (dom.includes(cat + '.') || dom.startsWith(cat)) return true;
            const domParts = dom
              .replace(/\.(com|org|net|io|co|edu|gov)(\.\w+)?$/, '')
              .split('.');
            return domParts.some((part: string) => part === cat);
          })
          .sort(
            (a: UserstyleEntry, b: UserstyleEntry) =>
              b.w - a.w || b.t - a.t
          )
          .slice(0, 100);

        this.loadThumbnails();
      } catch (e) {
        console.error('Find styles error:', e);
        this.error = true;
      } finally {
        this.loading = false;
      }
    },

    async loadThumbnails(): Promise<void> {
      const BATCH = 5;
      const ids = this.results.map(s => s.i);
      for (let i = 0; i < ids.length; i += BATCH) {
        await Promise.all(
          ids.slice(i, i + BATCH).map(async id => {
            try {
              const res = await fetch(
                `https://userstyles.world/api/style/preview/${id}.png`
              );
              if (!res.ok) return;
              const blob = await res.blob();
              this.$set(this.thumbnails, id, URL.createObjectURL(blob));
            } catch {
              // ignore — thumbnail stays blank
            }
          })
        );
      }
    },

    setBusy(id: number, busy: boolean): void {
      const next = new Set(this.busyIds);
      if (busy) next.add(id);
      else next.delete(id);
      this.busyIds = next;
    },

    async fetchCss(style: UserstyleEntry): Promise<string> {
      const cached = this.previewCssCache.get(style.i);
      if (cached) return cached;

      const url = style.source === 'usw'
        ? `https://userstyles.world/api/style/${style.i}.user.css`
        : `https://cdn.jsdelivr.net/gh/uso-archive/data@flomaster/data/usercss/${style.i}.user.css`;

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sourceCode = await res.text();
      const css = convertUserCssToRaw(sourceCode);

      if (css) {
        this.previewCssCache.set(style.i, css);
      }
      return css;
    },

    removePreview(): void {
      if (!this.tab?.id || this.previewingId === null) return;
      chrome.tabs.sendMessage(this.tab.id, {
        name: 'RemovePreviewStyle',
        id: String(this.previewingId),
      }).catch(() => {});
    },

    async togglePreview(style: UserstyleEntry): Promise<void> {
      if (!this.tab?.id) return;

      // Toggle off if already previewing this style
      if (this.previewingId === style.i) {
        this.removePreview();
        this.previewingId = null;
        return;
      }

      // Remove any existing preview
      if (this.previewingId !== null) {
        this.removePreview();
        this.previewingId = null;
      }

      this.setBusy(style.i, true);
      try {
        const css = await this.fetchCss(style);
        if (!css) {
          console.error('Preview: no CSS returned');
          return;
        }
        chrome.tabs.sendMessage(this.tab.id, {
          name: 'PreviewStyle',
          id: String(style.i),
          css,
        }).catch(() => {});
        this.previewingId = style.i;
      } catch (e) {
        console.error('Preview error:', e);
      } finally {
        this.setBusy(style.i, false);
      }
    },

    async installStyle(style: UserstyleEntry): Promise<void> {
      if (this.installingIds.has(style.i) || this.installedIds.has(style.i)) {
        return;
      }

      this.installingIds = new Set([...this.installingIds, style.i]);
      this.setBusy(style.i, true);

      try {
        const css = await this.fetchCss(style);
        if (!css || !css.trim()) {
          console.error('Install: no CSS content found');
          return;
        }

        const message: SetStyle = {
          name: 'SetStyle',
          url: this.domain || '*',
          css,
          readability: false,
        };
        chrome.runtime.sendMessage(message);

        this.installedIds = new Set([...this.installedIds, style.i]);
        // Don't remove preview — SetStyle only saves to storage, it doesn't
        // push the style to the live tab. Keep the preview CSS visible so the
        // user sees the style until next page reload.
        this.$emit('style-installed', this.domain);
      } catch (e) {
        console.error('Install style error:', e);
      } finally {
        const next = new Set(this.installingIds);
        next.delete(style.i);
        this.installingIds = next;
        this.setBusy(style.i, false);
      }
    },

    editStyle(): void {
      if (!this.tab?.id) return;

      const message: ToggleStylebot = {
        name: 'ToggleStylebot',
      };

      chrome.tabs.sendMessage(this.tab.id, message).catch(() => {});
      window.close();
    },

    deleteStyle(style: UserstyleEntry): void {
      const message: SetStyle = {
        name: 'SetStyle',
        url: this.domain,
        css: '',
        readability: false,
      };

      chrome.runtime.sendMessage(message);

      const next = new Set(this.installedIds);
      next.delete(style.i);
      this.installedIds = next;

      // Remove preview if active
      if (this.previewingId === style.i) {
        this.removePreview();
        this.previewingId = null;
      }


      this.$emit('style-deleted', this.domain);
    },

    getStyleUrl(style: UserstyleEntry): string {
      return style.source === 'usw'
        ? `https://userstyles.world/style/${style.i}`
        : `https://uso.kkx.one/style/${style.i}`;
    },

    truncate(str: string, len: number): string {
      return str.length > len ? str.slice(0, len) + '...' : str;
    },

    formatNumber(num: number): string {
      if (num > 1e6) return (num / 1e6).toFixed(1) + 'M';
      if (num > 1e3) return (num / 1e3).toFixed(1) + 'k';
      return String(num);
    },
  },
});
</script>

<style lang="scss">
.find-styles-btn {
  .b-icon {
    width: 16px;
    height: 16px;
  }
}

.find-styles-panel {
  max-height: 320px;
  overflow-y: auto;
  border-top: 1px solid #313244;
}

.find-styles-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 13px;
  color: #6c7086;
}

.find-styles-error {
  color: #f38ba8;
}

.find-styles-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #313244;
  border-top-color: #89b4fa;
  border-radius: 50%;
  animation: sk-spin 0.6s linear infinite;
}

.find-style-item {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #313244;
  transition: background 0.15s;

  &:hover {
    background: #313244;
  }

  &:last-child {
    border-bottom: none;
  }

  &.is-installed {
    .find-style-name {
      color: #a6e3a1;
    }
  }

  &.is-previewing {
    background: rgba(137, 180, 250, 0.08);
    border-left: 2px solid #89b4fa;

    .find-style-thumb {
      margin-left: -2px;
    }
  }
}

.find-style-thumb {
  width: 72px;
  height: 54px;
  object-fit: cover;
  flex-shrink: 0;
  background: #181825;
  border-right: 1px solid #313244;
}

.find-style-body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 10px;
}

.find-style-info {
  flex: 1;
  min-width: 0;
  margin-right: 6px;
}

.find-style-name {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #cdd6f4;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &:hover {
    color: #89b4fa;
  }
}

.find-style-meta {
  display: flex;
  gap: 6px;
  margin-top: 1px;
  font-size: 10px;
  color: #6c7086;
}

.find-style-author {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.find-style-installs {
  white-space: nowrap;
  flex-shrink: 0;
}

.find-style-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.find-style-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 3px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  transition: color 0.15s, background 0.15s;

  &:disabled {
    cursor: default;
    opacity: 0.4;
  }

  &.preview-btn {
    color: #6c7086;
    font-size: 10px;

    &:hover:not(:disabled) {
      color: #89b4fa;
      background: rgba(137, 180, 250, 0.1);
    }

    &.active {
      color: #89b4fa;
      background: rgba(137, 180, 250, 0.15);
    }
  }

  &.install-btn {
    color: #a6e3a1;
    font-size: 16px;
    font-weight: bold;

    &:hover:not(:disabled) {
      background: rgba(166, 227, 161, 0.1);
    }
  }

  &.edit-btn {
    color: #6c7086;

    &:hover {
      color: #cdd6f4;
      background: #313244;
    }
  }

  &.delete-btn {
    color: #6c7086;

    &:hover {
      color: #f38ba8;
      background: rgba(243, 139, 168, 0.1);
    }
  }
}

.find-style-spinner-sm {
  width: 12px;
  height: 12px;
  border: 2px solid #313244;
  border-top-color: #89b4fa;
  border-radius: 50%;
  animation: sk-spin 0.6s linear infinite;
}

@keyframes sk-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
