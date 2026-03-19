<template>
  <div class="popup">
    <b-list-group v-if="tab && tab.id" class="list-group">
      <b-list-group-item
        v-if="styles.length > 1"
        class="quick-toggle-row"
      >
        <span class="quick-toggle-label">{{ styles.length }} styles active</span>
        <button
          class="quick-toggle-btn"
          :title="allEnabled ? 'Disable all' : 'Enable all'"
          @click="toggleAll"
        >
          {{ allEnabled ? 'Disable All' : 'Enable All' }}
        </button>
      </b-list-group-item>

      <style-component
        v-for="style in styles"
        :key="style.url"
        :url="style.url"
        :tab="tab"
        :disable-toggle="isOpen"
        :initial-enabled="style.enabled"
        @deleted="onStyleDeleted"
        @toggled="onStyleToggled"
      />

      <readability v-if="showReadability" :initial-readability="readability" />

      <toggle-stylebot :is-open="isOpen" :tab="tab" />

      <find-styles :tab="tab" />

      <sync-stylebot v-if="googleDriveSyncEnabled" />

      <view-options />

      <release-notification />
    </b-list-group>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import StyleComponent from './components/Style.vue';
import ViewOptions from './components/ViewOptions.vue';
import Readability from './components/Readability.vue';
import SyncStylebot from './components/SyncStylebot.vue';
import ToggleStylebot from './components/ToggleStylebot.vue';
import FindStyles from './components/FindStyles.vue';
import ReleaseNotification from './components/notifications/ReleaseNotification.vue';

import { getStyles, getCurrentTab, getIsStylebotOpen } from './utils';

import { getGoogleDriveSyncEnabled } from '@stylekit/sync';
import { GoogleDriveSyncMetadata, EnableStyle, DisableStyle } from '@stylekit/types';

export default defineComponent({
  name: 'App',

  components: {
    ViewOptions,
    StyleComponent,
    ToggleStylebot,
    FindStyles,
    Readability,
    SyncStylebot,
    ReleaseNotification,
  },

  data(): {
    isOpen: boolean;
    readability: boolean;
    showReadability: boolean;
    tab?: chrome.tabs.Tab;
    styles: Array<{ url: string; css: string; enabled: boolean }>;
    googleDriveSyncEnabled: boolean;
    googleDriveSyncMetadata?: GoogleDriveSyncMetadata;
  } {
    return {
      styles: [],
      isOpen: false,
      tab: undefined,
      readability: false,
      showReadability: false,
      googleDriveSyncEnabled: false,
      googleDriveSyncMetadata: undefined,
    };
  },

  computed: {
    allEnabled(): boolean {
      return this.styles.every(s => s.enabled);
    },
  },

  async created() {
    const tab = await getCurrentTab();
    if (!tab) return;

    this.tab = tab;

    const [isOpen, { styles, defaultStyle }] = await Promise.all([
      getIsStylebotOpen(this.tab),
      getStyles(this.tab),
    ]);

    this.isOpen = isOpen;
    this.styles = styles.filter(style => style.css);
    this.readability = !!defaultStyle && defaultStyle.readability;
    this.googleDriveSyncEnabled = await getGoogleDriveSyncEnabled();

    const optionsResult = await chrome.storage.local.get('options');
    const opts = optionsResult['options'] || {};
    this.showReadability = !!opts.showReadability;
  },

  methods: {
    onStyleDeleted(url: string): void {
      this.styles = this.styles.filter(s => s.url !== url);
    },

    onStyleToggled({ url, enabled }: { url: string; enabled: boolean }): void {
      const style = this.styles.find(s => s.url === url);
      if (style) {
        style.enabled = enabled;
      }
    },

    toggleAll(): void {
      const enable = !this.allEnabled;

      this.styles.forEach(style => {
        style.enabled = enable;

        if (enable) {
          const message: EnableStyle = { name: 'EnableStyle', url: style.url };
          chrome.runtime.sendMessage(message);
        } else {
          const message: DisableStyle = { name: 'DisableStyle', url: style.url };
          chrome.runtime.sendMessage(message);
        }
      });
    },
  },
});
</script>

<style lang="scss">
@import 'bootstrap/scss/bootstrap';
@import 'bootstrap-vue-3/dist/bootstrap-vue-3.css';
@import './scss/dark-mode';

body,
span {
  margin: 0;
  font-size: 15px;
}

body {
  width: 360px;
  overflow: hidden;
}

.popup {
  width: 100%;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
  }
}

.list-group {
  border-radius: 0;

  .list-group-item {
    &:focus {
      outline: none;
    }
  }
}

.quick-toggle-row {
  display: flex !important;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px !important;
  font-size: 12px;
}

.quick-toggle-label {
  color: #a6adc8;
  font-weight: 500;
}

.quick-toggle-btn {
  background: #313244;
  border: 1px solid #45475a;
  color: #cdd6f4;
  font-size: 11px;
  padding: 2px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: #45475a;
    border-color: #585b70;
  }
}
</style>
