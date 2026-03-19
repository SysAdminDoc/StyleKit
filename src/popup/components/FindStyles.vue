<template>
  <div>
    <!-- Installed USW styles: each as its own popup entry -->
    <div v-if="domainInstalled.length > 0" class="usw-installed-list">
      <b-list-group-item
        v-for="entry in domainInstalled"
        :key="entry.id"
        class="usw-installed-row"
      >
        <label class="usw-toggle" :title="entry.enabled !== false ? 'Disable' : 'Enable'">
          <input
            type="checkbox"
            :checked="entry.enabled !== false"
            @change="toggleInstalledStyle(entry.id)"
          />
          <span class="usw-toggle-track" />
        </label>
        <span
          class="usw-installed-name"
          :class="{ 'usw-installed-disabled': entry.enabled === false }"
          :title="entry.name"
        >{{ truncate(entry.name, 30) }}</span>
        <div class="usw-installed-actions">
          <button class="style-action-btn edit-btn" title="Edit CSS" @click="editStyle()">&#x270E;</button>
          <button class="style-action-btn delete-btn" title="Uninstall" @click="deleteStyleById(entry.id)">&#x2715;</button>
        </div>
      </b-list-group-item>
    </div>



    <b-list-group-item v-if="!autoLoadStyles" button class="find-styles-btn" @click="toggleSearch">
      <b-icon icon="search" />
      <span class="pl-2">{{ t('find_styles') }}</span>
      <span v-if="allResults.length > 0" class="find-styles-badge">
        {{ allResults.length }}
      </span>
    </b-list-group-item>
    <div v-if="showSearch" class="find-styles-panel">
      <!-- Loading -->
      <div v-if="loading" class="find-styles-status">
        <div class="find-styles-spinner"></div>
        <span>{{ t('loading_styles') }}</span>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="find-styles-status find-styles-error">
        {{ t('style_search_error') }}
      </div>

      <template v-else>
        <!-- Header -->
        <div class="find-styles-header">
          <div class="find-styles-domain-row">
            <span class="find-styles-domain">{{ domain }}</span>
            <span class="find-styles-count">
              {{ results.length }}{{ nameFilter ? '' : '+' }} style{{ results.length !== 1 ? 's' : '' }}
            </span>
          </div>
          <input
            v-model="nameFilter"
            class="find-styles-search"
            type="text"
            placeholder="Filter by name..."
          />
        </div>

        <!-- No results -->
        <div v-if="results.length === 0" class="find-styles-status">
          {{ nameFilter ? 'No matching styles' : t('no_styles_found') }}
        </div>

        <!-- Style list -->
        <div v-else class="find-styles-results">
          <div
            v-for="style in results"
            :key="style.i"
            class="find-style-item"
            :class="{ 'is-previewing': previewingId === style.i }"
            @mouseenter="hoverPreview(style)"
            @mouseleave="hoverLeave"
          >
            <!-- Thumbnail -->
            <div class="find-style-thumb-wrap">
              <img
                v-if="thumbnails[style.i]"
                class="find-style-thumb"
                :src="thumbnails[style.i]"
                alt=""
              />
              <div v-else class="find-style-thumb-placeholder">
                <div class="find-style-thumb-spin"></div>
              </div>
            </div>

            <!-- Info + actions -->
            <div class="find-style-body">
              <div class="find-style-info">
                <div class="find-style-name-row">
                  <a
                    class="find-style-name"
                    :href="getStyleUrl(style)"
                    target="_blank"
                    :title="style.n"
                  >{{ truncate(style.n, 34) }}</a>
                </div>
                <div class="find-style-meta">
                  <span class="find-style-author">{{ style.an }}</span>
                  <span v-if="style.w" class="find-style-installs">
                    {{ formatNumber(style.w) }}/wk
                  </span>
                </div>
              </div>

              <div class="find-style-actions">
                <button
                  class="find-style-btn install-btn"
                  :disabled="busyIds.has(style.i)"
                  title="Install style"
                  @click="installStyle(style)"
                >
                  <span v-if="installingIds.has(style.i)" class="find-style-spinner-sm"></span>
                  <template v-else>Install</template>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { SetStyle, OpenStylebotInCodeMode } from '@stylekit/types';
import { convertUserCssToRaw } from '../../utils/usercss';

const STORAGE_KEY = 'stylekit-usw-installs';
const INDEX_SESSION_KEY = 'stylekit-usw-index';
const THUMB_LOCAL_KEY = 'stylekit-usw-thumbs';
const INDEX_TTL_MS = 60 * 60 * 1000;

interface UserstyleEntry {
  i: number;
  n: string;
  c: string;
  u: number;
  t: number;
  w: number;
  r: number;
  an: string;
  sn: string; // screenshot URL
  source: 'usw';
}

interface InstalledEntry {
  domain: string;
  css: string;
  name: string;
  enabled?: boolean;
}

export default defineComponent({
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
    allResults: UserstyleEntry[];
    nameFilter: string;
    installedMap: Record<number, InstalledEntry>;
    installingIds: Set<number>;
    busyIds: Set<number>;
    previewingId: number | null;
    previewCssCache: Map<number, string>;
    thumbnails: Record<number, string>;
    domain: string;
    hoverTimer: ReturnType<typeof setTimeout> | null;
    autoLoadStyles: boolean;
  } {
    return {
      showSearch: false,
      loading: false,
      error: false,
      allResults: [],
      nameFilter: '',
      installedMap: {},
      installingIds: new Set(),
      busyIds: new Set(),
      previewingId: null,
      previewCssCache: new Map(),
      thumbnails: {},
      domain: '',
      hoverTimer: null,
      autoLoadStyles: false,
    };
  },

  computed: {
    results(): UserstyleEntry[] {
      const q = this.nameFilter.toLowerCase().trim();
      const uninstalled = this.allResults.filter(s => !this.installedIds.has(s.i));
      const sorted = [...uninstalled].sort((a, b) => b.w - a.w || b.t - a.t);
      if (!q) return sorted;
      return sorted.filter(s => s.n.toLowerCase().includes(q));
    },

    installedIds(): Set<number> {
      return new Set(
        Object.keys(this.installedMap).map(Number)
      );
    },

    domainInstalled(): Array<{ id: number; name: string; domain: string; css: string }> {
      if (!this.domain) return [];
      return Object.entries(this.installedMap)
        .filter(([, entry]) => entry.domain === this.domain)
        .map(([id, entry]) => ({ id: Number(id), ...entry }));
    },
  },

  async mounted(): Promise<void> {
    this.domain = this.getDomain();
    await this.loadInstalledMap();

    const optResult = await chrome.storage.local.get('options');
    const opts = (optResult['options'] as Record<string, unknown>) || {};
    this.autoLoadStyles = !!opts.autoLoadStyles;

    if (this.autoLoadStyles) {
      this.showSearch = true;
      this.search();
    }
  },

  beforeDestroy(): void {
    if (this.hoverTimer !== null) {
      clearTimeout(this.hoverTimer);
    }
    this.removePreview();
  },

  methods: {
    toggleSearch(): void {
      this.showSearch = !this.showSearch;
      if (this.showSearch && this.allResults.length === 0) {
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

    async loadInstalledMap(): Promise<void> {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const raw = (result[STORAGE_KEY] as Record<number, InstalledEntry>) || {};
      // Migrate old entries that were saved before the 'name' field was added
      Object.values(raw).forEach(entry => {
        if (!entry.name) entry.name = 'Unnamed Style';
      });
      this.installedMap = raw;
    },

    async saveInstalledMap(map: Record<number, InstalledEntry>): Promise<void> {
      await chrome.storage.local.set({ [STORAGE_KEY]: map });
    },

    getMergedCssForDomain(domain: string, map: Record<number, InstalledEntry>): string {
      return Object.values(map)
        .filter(e => e.domain === domain && e.enabled !== false)
        .map(e => e.css)
        .join('\n\n')
        .trim();
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
        await this.loadInstalledMap();

                // Use session-cached index if fresh (defensive: session may not be available)
        let index: UserstyleEntry[];
        try {
          const sessionResult = await chrome.storage.session.get(INDEX_SESSION_KEY);
          const sessionCache = sessionResult[INDEX_SESSION_KEY] as
            | { data: UserstyleEntry[]; ts: number }
            | undefined;
          if (sessionCache && Date.now() - sessionCache.ts < INDEX_TTL_MS) {
            index = sessionCache.data;
          } else {
            const res = await fetch('https://userstyles.world/api/index/uso-format', {
              referrerPolicy: 'no-referrer',
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            index = (json.data || []).map((e: any) => ({ ...e, source: 'usw' as const }));
            try {
              await chrome.storage.session.set({
                [INDEX_SESSION_KEY]: { data: index, ts: Date.now() },
              });
            } catch { /* session storage unavailable */ }
          }
        } catch {
          // Session storage unavailable — fetch index directly
          const res = await fetch('https://userstyles.world/api/index/uso-format', {
            referrerPolicy: 'no-referrer',
          });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          index = (json.data || []).map((e: any) => ({ ...e, source: 'usw' as const }));
        }

        const dom = this.domain.toLowerCase().replace(/^www\./, '');
        this.allResults = index
          .filter((entry: UserstyleEntry) => {
            const cat = (entry.c || '').toLowerCase().replace(/^www\./, '');
            if (!cat) return false;
            if (cat === dom) return true;
            if (dom.endsWith('.' + cat) || cat.endsWith('.' + dom)) return true;
            const domCore = dom.replace(/\.(com|org|net|io|co|edu|gov|me|app|dev)(\.\w+)?$/, '');
            const catCore = cat.replace(/\.(com|org|net|io|co|edu|gov|me|app|dev)(\.\w+)?$/, '');
            if (domCore === catCore) return true;
            return domCore.split('.').some((part: string) => part === catCore || part === cat);
          })
          .slice(0, 150);

        this.loadThumbnails();
      } catch (e) {
        console.error('Find styles error:', e);
        this.error = true;
      } finally {
        this.loading = false;
      }
    },

    async fetchThumbnailDataUrl(url: string): Promise<string> {
      try {
        const res = await fetch(url, { referrerPolicy: 'no-referrer' });
        if (!res.ok) return '';
        const buffer = await res.arrayBuffer();
        const uint8 = new Uint8Array(buffer);
        const CHUNK = 8192;
        let binary = '';
        for (let i = 0; i < uint8.length; i += CHUNK) {
          binary += String.fromCharCode(...Array.from(uint8.subarray(i, i + CHUNK)));
        }
        const contentType = res.headers.get('content-type') || 'image/webp';
        return `data:${contentType};base64,${btoa(binary)}`;
      } catch {
        return '';
      }
    },

    async loadThumbnails(): Promise<void> {
      const styles = this.allResults.filter(s => s.sn);
      if (!styles.length) return;

      // Apply cached thumbnails immediately
      const thumbResult = await chrome.storage.local.get(THUMB_LOCAL_KEY);
      const thumbCache = (thumbResult[THUMB_LOCAL_KEY] as Record<number, string>) || {};
      for (const style of styles) {
        if (thumbCache[style.i]) {
          this.$set(this.thumbnails, style.i, thumbCache[style.i]);
        }
      }

      // Load first 10 uncached thumbnails
      const uncached = styles.filter(s => !this.thumbnails[s.i]);
      await this.fetchThumbBatch(uncached.slice(0, 10));

      // Load next 10 in background while user scrolls first batch
      if (uncached.length > 10) {
        this.fetchThumbBatch(uncached.slice(10, 20));
      }
    },

    async fetchThumbBatch(styles: UserstyleEntry[]): Promise<void> {
      await Promise.all(
        styles.map(async style => {
          const dataUrl = await this.getThumb(style.i, style.sn);
          if (dataUrl) this.$set(this.thumbnails, style.i, dataUrl);
        })
      );
    },

    getThumb(styleId: number, url: string): Promise<string> {
      return new Promise(resolve => {
        chrome.runtime.sendMessage(
          { name: 'GetThumbnail', styleId, url },
          (response: string) => resolve(response || '')
        );
      });
    },

    setBusy(id: number, busy: boolean): void {
      const next = new Set(this.busyIds);
      if (busy) next.add(id);
      else next.delete(id);
      this.busyIds = next;
    },

    async fetchCss(style: UserstyleEntry): Promise<string> {
      const cached = this.previewCssCache.get(style.i);
      if (cached !== undefined) return cached;

      const url = `https://userstyles.world/api/style/${style.i}.user.css`;

      const res = await fetch(url, { referrerPolicy: 'no-referrer' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const sourceCode = await res.text();
      const css = convertUserCssToRaw(sourceCode);
      if (css) this.previewCssCache.set(style.i, css);
      return css;
    },

    removePreview(): void {
      if (!this.tab?.id || this.previewingId === null) return;
      chrome.tabs
        .sendMessage(this.tab.id, {
          name: 'RemovePreviewStyle',
          id: String(this.previewingId),
        })
        .catch(() => { /* fire-and-forget */ });
    },

    hoverPreview(style: UserstyleEntry): void {
      if (this.hoverTimer !== null) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
      this.hoverTimer = setTimeout(async () => {
        this.hoverTimer = null;
        if (!this.tab?.id) return;
        if (this.previewingId === style.i) return;
        if (this.previewingId !== null) {
          this.removePreview();
          this.previewingId = null;
        }
        try {
          const css = await this.fetchCss(style);
          if (!css) return;
          chrome.tabs
            .sendMessage(this.tab.id, { name: 'PreviewStyle', id: String(style.i), css })
            .catch(() => { /* fire-and-forget */ });
          this.previewingId = style.i;
        } catch (e) {
          console.error('Hover preview error:', e);
        }
      }, 350);
    },

    hoverLeave(): void {
      if (this.hoverTimer !== null) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
      this.removePreview();
      this.previewingId = null;
    },

    async togglePreview(style: UserstyleEntry): Promise<void> {
      if (!this.tab?.id) return;

      if (this.previewingId === style.i) {
        this.removePreview();
        this.previewingId = null;
        return;
      }

      if (this.previewingId !== null) {
        this.removePreview();
        this.previewingId = null;
      }

      this.setBusy(style.i, true);
      try {
        const css = await this.fetchCss(style);
        if (!css) return;
        chrome.tabs
          .sendMessage(this.tab.id, { name: 'PreviewStyle', id: String(style.i), css })
          .catch(() => { /* fire-and-forget */ });
        this.previewingId = style.i;
      } catch (e) {
        console.error('Preview error:', e);
      } finally {
        this.setBusy(style.i, false);
      }
    },

    async installStyle(style: UserstyleEntry): Promise<void> {
      if (this.installingIds.has(style.i) || this.installedIds.has(style.i)) return;

      this.installingIds = new Set([...this.installingIds, style.i]);
      this.setBusy(style.i, true);

      try {
        // Use cached CSS from preview if available, otherwise fetch
        const css = await this.fetchCss(style);
        if (!css?.trim()) {
          console.error('Install: no CSS returned');
          return;
        }

        // Persist to our tracking map so install state survives popup close
        const newMap: Record<number, InstalledEntry> = {
          ...this.installedMap,
          [style.i]: { domain: this.domain, css, name: style.n },
        };
        await this.saveInstalledMap(newMap);
        this.installedMap = newMap;

        // Merge all installed styles for this domain into one SetStyle call
        const mergedCss = this.getMergedCssForDomain(this.domain, newMap);
        chrome.runtime.sendMessage({
          name: 'SetStyle',
          url: this.domain,
          css: mergedCss,
          readability: false,
        } as SetStyle);

        // Instantly inject into the live tab without requiring a refresh
        if (this.tab?.id) {
          chrome.tabs.sendMessage(this.tab.id, {
            name: 'PreviewStyle',
            id: `usw-installed-${this.domain}`,
            css: mergedCss,
          }).catch(() => { /* fire-and-forget */ });
        }

        // Clear hover preview — installed style is now injected permanently
        if (this.previewingId === style.i) {
          this.previewingId = null;
        }
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

    async toggleInstalledStyle(id: number): Promise<void> {
      const entry = this.installedMap[id];
      if (!entry) return;
      const domain = entry.domain;
      const newEnabled = entry.enabled === false ? true : false;

      const newMap: Record<number, InstalledEntry> = {
        ...this.installedMap,
        [id]: { ...entry, enabled: newEnabled },
      };
      await this.saveInstalledMap(newMap);
      this.installedMap = newMap;

      const mergedCss = this.getMergedCssForDomain(domain, newMap);
      chrome.runtime.sendMessage({
        name: 'SetStyle',
        url: domain,
        css: mergedCss,
        readability: false,
      } as SetStyle);

      if (this.tab?.id) {
        if (mergedCss) {
          chrome.tabs.sendMessage(this.tab.id, {
            name: 'PreviewStyle',
            id: `usw-installed-${domain}`,
            css: mergedCss,
          }).catch(() => { /* fire-and-forget */ });
        } else {
          chrome.tabs.sendMessage(this.tab.id, {
            name: 'RemovePreviewStyle',
            id: `usw-installed-${domain}`,
          }).catch(() => { /* fire-and-forget */ });
        }
      }
    },

    async deleteStyleById(id: number): Promise<void> {
      const entry = this.installedMap[id];
      if (!entry) return;
      const domain = entry.domain;

      const newMap: Record<number, InstalledEntry> = { ...this.installedMap };
      delete newMap[id];
      await this.saveInstalledMap(newMap);
      this.installedMap = newMap;

      const mergedCss = this.getMergedCssForDomain(domain, newMap);
      chrome.runtime.sendMessage({
        name: 'SetStyle',
        url: domain,
        css: mergedCss,
        readability: false,
      } as SetStyle);

      // Instantly update or remove the injected style in the live tab
      if (this.tab?.id) {
        if (mergedCss) {
          chrome.tabs.sendMessage(this.tab.id, {
            name: 'PreviewStyle',
            id: `usw-installed-${domain}`,
            css: mergedCss,
          }).catch(() => { /* fire-and-forget */ });
        } else {
          chrome.tabs.sendMessage(this.tab.id, {
            name: 'RemovePreviewStyle',
            id: `usw-installed-${domain}`,
          }).catch(() => { /* fire-and-forget */ });
        }
      }

      if (this.previewingId === id) {
        this.removePreview();
        this.previewingId = null;
      }

      this.$emit('style-deleted', domain);
    },

    async deleteStyle(style: UserstyleEntry): Promise<void> {
      await this.deleteStyleById(style.i);
    },

    editStyle(): void {
      if (!this.tab?.id) return;
      chrome.tabs
        .sendMessage(this.tab.id, { name: 'OpenStylebotInCodeMode' } as OpenStylebotInCodeMode)
        .catch(() => { /* fire-and-forget */ });
      window.close();
    },

    getStyleUrl(style: UserstyleEntry): string {
      return `https://userstyles.world/style/${style.i}`;
    },

    truncate(str: string | undefined | null, len: number): string {
      if (!str) return '';
      return str.length > len ? str.slice(0, len) + '…' : str;
    },

    formatNumber(num: number): string {
      if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
      if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
      return String(num);
    },
  },
});
</script>

<style lang="scss">
/* ── Installed USW style rows (shown above trigger) ─────────── */
.usw-installed-list {
  max-height: 148px; // ~4 rows before scrolling
  overflow-y: auto;
  border-bottom: 1px solid #313244;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 2px;
  }
}

.usw-installed-row {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 12px !important;
  gap: 6px;
  background: rgba(166, 227, 161, 0.04);
  border-left: 2px solid rgba(166, 227, 161, 0.4) !important;
}

.usw-toggle {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin: 0 6px 0 0;
  flex-shrink: 0;

  input {
    display: none;
  }

  .usw-toggle-track {
    width: 28px;
    height: 15px;
    border-radius: 8px;
    background: #45475a;
    position: relative;
    transition: background 0.18s;
    display: block;

    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: #6c7086;
      transition: transform 0.18s, background 0.18s;
    }
  }

  input:checked + .usw-toggle-track {
    background: rgba(166, 227, 161, 0.3);

    &::after {
      transform: translateX(13px);
      background: #a6e3a1;
    }
  }
}

.usw-installed-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: #a6e3a1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  &.usw-installed-disabled {
    color: #45475a;
    text-decoration: line-through;
  }
}

.usw-installed-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

/* ── Trigger button ─────────────────────────────────────────── */
.find-styles-btn {
  .b-icon {
    width: 16px;
    height: 16px;
  }
}

.find-styles-badge {
  margin-left: auto;
  background: #313244;
  color: #89b4fa;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  line-height: 16px;
}

/* ── Panel shell ────────────────────────────────────────────── */
.find-styles-panel {
  max-height: 380px;
  overflow-y: auto;
  border-top: 1px solid #313244;
}

/* ── Header: domain + count + search ───────────────────────── */
.find-styles-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #1e1e2e;
  border-bottom: 1px solid #313244;
  padding: 8px 10px 6px;
}

.find-styles-domain-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
}

.find-styles-domain {
  font-size: 11px;
  font-weight: 600;
  color: #cdd6f4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.find-styles-count {
  font-size: 10px;
  color: #6c7086;
  flex-shrink: 0;
  margin-left: 8px;
}

.find-styles-search {
  width: 100%;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 4px;
  color: #cdd6f4;
  font-size: 11px;
  padding: 4px 8px;
  outline: none;
  box-sizing: border-box;

  &::placeholder {
    color: #585b70;
  }

  &:focus {
    border-color: #89b4fa;
  }
}

/* ── Status messages ────────────────────────────────────────── */
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
  flex-shrink: 0;
}

/* ── Results list ───────────────────────────────────────────── */
.find-styles-results {
  /* inherits panel scroll */
}

.find-style-item {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #313244;
  transition: background 0.12s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: #26273a;
  }

  &.is-previewing {
    background: rgba(137, 180, 250, 0.06);
    border-left: 2px solid #89b4fa;

    .find-style-thumb-wrap {
      margin-left: -2px;
    }
  }
}

/* ── Thumbnail ──────────────────────────────────────────────── */
.find-style-thumb-wrap {
  width: 80px;
  height: 60px;
  flex-shrink: 0;
  background: #181825;
  border-right: 1px solid #313244;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.find-style-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.find-style-thumb-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.find-style-thumb-spin {
  width: 16px;
  height: 16px;
  border: 2px solid #313244;
  border-top-color: #45475a;
  border-radius: 50%;
  animation: sk-spin 0.8s linear infinite;
}

/* ── Body: info + actions ───────────────────────────────────── */
.find-style-body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px 6px 10px;
  gap: 6px;
}

.find-style-info {
  flex: 1;
  min-width: 0;
}

.find-style-name-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
}

.find-style-name {
  font-size: 12px;
  font-weight: 500;
  color: #cdd6f4;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;

  &:hover {
    color: #89b4fa;
    text-decoration: underline;
  }
}


.find-style-meta {
  display: flex;
  gap: 6px;
  margin-top: 2px;
  font-size: 10px;
  color: #585b70;
}

.find-style-author {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 90px;
}

.find-style-installs {
  white-space: nowrap;
  flex-shrink: 0;
  color: #6c7086;
}

/* ── Action buttons ─────────────────────────────────────────── */
.find-style-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.find-style-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
  transition: color 0.12s, background 0.12s;

  &:disabled {
    cursor: default;
    opacity: 0.35;
  }

  &.install-btn {
    width: auto;
    padding: 0 8px;
    font-size: 11px;
    font-weight: 600;
    color: #a6e3a1;
    background: rgba(166, 227, 161, 0.08);
    border: 1px solid rgba(166, 227, 161, 0.2);
    border-radius: 4px;

    &:hover:not(:disabled) {
      background: rgba(166, 227, 161, 0.18);
      border-color: rgba(166, 227, 161, 0.4);
    }
  }

  &.edit-btn {
    color: #585b70;
    font-size: 13px;

    &:hover {
      color: #cdd6f4;
      background: #313244;
    }
  }

  &.delete-btn {
    color: #585b70;
    font-size: 11px;

    &:hover {
      color: #f38ba8;
      background: rgba(243, 139, 168, 0.1);
    }
  }
}

.find-style-spinner-sm {
  width: 10px;
  height: 10px;
  border: 2px solid #313244;
  border-top-color: #89b4fa;
  border-radius: 50%;
  animation: sk-spin 0.6s linear infinite;
}

@keyframes sk-spin {
  to { transform: rotate(360deg); }
}
</style>
