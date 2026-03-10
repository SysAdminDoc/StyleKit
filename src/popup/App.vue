<template>
  <div class="popup">
    <b-list-group v-if="tab && tab.id" class="list-group">
      <style-component
        v-for="style in styles"
        :key="style.url"
        :url="style.url"
        :tab="tab"
        :disable-toggle="isOpen"
        :initial-enabled="style.enabled"
        @deleted="onStyleDeleted"
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
import Vue from 'vue';

import StyleComponent from './components/Style.vue';
import ViewOptions from './components/ViewOptions.vue';
import Readability from './components/Readability.vue';
import SyncStylebot from './components/SyncStylebot.vue';
import ToggleStylebot from './components/ToggleStylebot.vue';
import FindStyles from './components/FindStyles.vue';
import ReleaseNotification from './components/notifications/ReleaseNotification.vue';

import { getStyles, getCurrentTab, getIsStylebotOpen } from './utils';

import { getGoogleDriveSyncEnabled } from '@stylebot/sync';
import { GoogleDriveSyncMetadata } from '@stylebot/types';

export default Vue.extend({
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
  },
});
</script>

<style lang="scss">
@import '~bootstrap';
@import '~bootstrap-vue';
@import './scss/dark-mode';

body,
span {
  margin: 0;
  font-size: 15px;
}

body {
  width: 360px;
  height: 580px;
  overflow: hidden;
}

.popup {
  width: 100%;
  height: 100%;
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
</style>
