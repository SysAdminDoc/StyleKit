import { createStore } from 'vuex';

import { defaultCommands } from '@stylekit/settings';
import {
  StyleMap,
  StylebotOptions,
  StylebotCommands,
  GoogleDriveSyncMetadata,
  GoogleDriveSyncReport,
  StylesRollbackReason,
  StylesRollbackSnapshot,
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
  getLastStylesRollbackSnapshot,
  restoreLastStylesRollbackSnapshot,
} from '../utils';

type State = {
  styles: StyleMap;

  options: StylebotOptions | null;
  commands: StylebotCommands;

  googleDriveSyncEnabled: boolean;
  googleDriveSyncMetadata: GoogleDriveSyncMetadata | undefined;
  googleDriveSyncReport: GoogleDriveSyncReport | null;
  lastStylesRollbackSnapshot: StylesRollbackSnapshot | null;
};

type SetAllStylesPayload =
  | StyleMap
  | {
      styles: StyleMap;
      rollbackReason?: StylesRollbackReason;
    };

const isSetAllStylesPayloadWithReason = (
  payload: SetAllStylesPayload
): payload is { styles: StyleMap; rollbackReason?: StylesRollbackReason } =>
  'rollbackReason' in payload && 'styles' in payload;

export default createStore<State>({
  state: {
    styles: {},
    options: null,
    commands: defaultCommands,
    googleDriveSyncEnabled: false,
    googleDriveSyncMetadata: undefined,
    googleDriveSyncReport: null,
    lastStylesRollbackSnapshot: null,
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

    async getLastStylesRollbackSnapshot({ state }) {
      state.lastStylesRollbackSnapshot = await getLastStylesRollbackSnapshot();
    },

    async setAllStyles({ state, dispatch }, payload: SetAllStylesPayload) {
      const styles = isSetAllStylesPayloadWithReason(payload)
        ? payload.styles
        : payload;
      const rollbackReason = isSetAllStylesPayloadWithReason(payload)
        ? payload.rollbackReason
        : undefined;

      await setAllStyles(styles, rollbackReason);
      state.styles = styles;

      if (rollbackReason) {
        await dispatch('getLastStylesRollbackSnapshot');
      }
    },

    async restoreLastStylesRollbackSnapshot({ dispatch }) {
      const snapshot = await restoreLastStylesRollbackSnapshot();

      if (snapshot) {
        await dispatch('getAllStyles');
        await dispatch('getLastStylesRollbackSnapshot');
      }

      return snapshot;
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
      if (!state.options) {
        return;
      }

      state.options = {
        ...state.options,
        [name]: value,
      } as StylebotOptions;
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

    async syncWithGoogleDrive({ state, dispatch }): Promise<string | null> {
      try {
        const report = await runGoogleDriveSync();
        state.googleDriveSyncReport = report;
        await dispatch('getGoogleDriveSyncMetadata');
        await dispatch('getAllStyles');
        await dispatch('getLastStylesRollbackSnapshot');
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
