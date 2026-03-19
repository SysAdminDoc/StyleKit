import { createStore } from 'vuex';

import { defaultCommands } from '@stylekit/settings';
import {
  StyleMap,
  StylebotOptions,
  StylebotCommands,
  GoogleDriveSyncMetadata,
} from '@stylekit/types';
import {
  getGoogleDriveSyncEnabled,
  getGoogleDriveSyncMetadata,
} from '@stylekit/sync';
import { getCurrentTimestamp } from '@stylekit/utils';
import { safeParse } from '@stylekit/css';
import { setGoogleDriveSyncEnabled } from '@stylekit/sync';

import {
  getAllStyles,
  setAllStyles,
  setOption,
  getAllOptions,
  getCommands,
  setCommands,
  runGoogleDriveSync,
} from '../utils';

type State = {
  styles: StyleMap;

  options: StylebotOptions | null;
  commands: StylebotCommands;

  googleDriveSyncEnabled: boolean;
  googleDriveSyncMetadata: GoogleDriveSyncMetadata | undefined;
};

export default createStore<State>({
  state: {
    styles: {},
    options: null,
    commands: defaultCommands,
    googleDriveSyncEnabled: false,
    googleDriveSyncMetadata: undefined,
  },

  actions: {
    async getAllStyles({ state }) {
      state.styles = await getAllStyles();
    },

    async getAllOptions({ state }) {
      state.options = await getAllOptions();
    },

    async getCommands({ state }) {
      state.commands = await getCommands();
    },

    async getGoogleDriveSyncMetadata({ state }) {
      state.googleDriveSyncEnabled = await getGoogleDriveSyncEnabled();
      if (state.googleDriveSyncEnabled) {
        state.googleDriveSyncMetadata = await getGoogleDriveSyncMetadata();
      }
    },

    setAllStyles({ state }, styles: StyleMap) {
      state.styles = styles;
      setAllStyles(styles);
    },

    saveStyle(
      { state },
      {
        initialUrl,
        url,
        css,
      }: { initialUrl?: string; url: string; css: string }
    ): string | null {
      try {
        // validate by parsing
        safeParse(css);
        const styles = { ...state.styles };

        styles[url] = {
          css,
          readability: styles[url] ? styles[url].readability : false,
          enabled: styles[url] ? styles[url].enabled : true,
          modifiedTime: getCurrentTimestamp(),
        };

        if (initialUrl && initialUrl !== url) {
          delete styles[initialUrl];
        }

        setAllStyles(styles);
        state.styles = styles;
        return null;
      } catch (e) {
        console.warn('StyleKit: failed to save style — invalid CSS', e);
        return 'Invalid CSS syntax. Please check your styles and try again.';
      }
    },

    deleteStyle({ state }, url: string) {
      const styles = { ...state.styles };

      delete styles[url];
      setAllStyles(styles);

      state.styles = styles;
    },

    deleteAllStyles({ state }) {
      state.styles = {};
      setAllStyles(state.styles);
    },

    enableStyle({ state }, url: string) {
      if (state.styles[url]) {
        state.styles[url].enabled = true;
      }

      setAllStyles(state.styles);
    },

    disableStyle({ state }, url: string) {
      if (state.styles[url]) {
        state.styles[url].enabled = false;
      }

      setAllStyles(state.styles);
    },

    enableAllStyles({ state }) {
      for (const url in state.styles) {
        state.styles[url].enabled = true;
      }

      setAllStyles(state.styles);
    },

    disableAllStyles({ state }) {
      for (const url in state.styles) {
        state.styles[url].enabled = false;
      }
      setAllStyles(state.styles);
    },

    setOption(
      { state },
      {
        name,
        value,
      }: {
        name: keyof StylebotOptions;
        value: StylebotOptions[keyof StylebotOptions];
      }
    ) {
      /* @ts-ignore */
      state.options[name] = value;
      setOption(name, value);
    },

    setCommands({ state }, commands: StylebotCommands) {
      state.commands = commands;
      setCommands(commands);
    },

    setGoogleDriveSyncEnabled({ state, dispatch }, enabled: boolean) {
      state.googleDriveSyncEnabled = enabled;
      setGoogleDriveSyncEnabled(enabled);

      if (enabled) {
        dispatch('syncWithGoogleDrive');
      } else {
        state.googleDriveSyncMetadata = undefined;
      }
    },

    async syncWithGoogleDrive({ dispatch }): Promise<string | null> {
      try {
        await runGoogleDriveSync();
        await dispatch('getGoogleDriveSyncMetadata');
        await dispatch('getAllStyles');
        return null;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : typeof e === 'string' ? e : 'Sync failed';
        console.error('Google Drive sync error:', e);
        return message;
      }
    },
  },
});
