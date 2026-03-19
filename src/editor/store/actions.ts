import { Commit, Dispatch, Store } from 'vuex';

import { State } from './';

import {
  addDeclaration,
  addGoogleWebFont,
  cleanGoogleWebFonts,
  injectRootIntoDocument,
  getCssAfterApplyingFilterEffectToPage,
  removeEmptyRules,
  safeParse,
} from '@stylekit/css';

import {
  apply as applyReadability,
  remove as removeReadability,
} from '@stylekit/readability';

import {
  Style,
  StylebotEditingMode,
  FilterEffect,
  ReadabilitySettings,
  StylebotBasicModeSections,
  StylebotLayout,
  StylebotColorPalette,
} from '@stylekit/types';

import { defaultOptions } from '@stylekit/settings';

import {
  getAllOptions,
  setOption,
  setStyle,
  getStylesForPage,
  enableStyle,
  setReadability,
  getCommands,
  getReadabilitySettings,
  setReadabilitySettings,
} from '../utils/chrome';

import { initListeners } from '../listeners';
import { initEditor } from '../utils/init-editor';

export default {
  async initialize(
    { commit, dispatch }: { commit: Commit; dispatch: Dispatch },
    store: Store<State>
  ): Promise<void> {
    const { defaultStyle } = await getStylesForPage(false);
    if (defaultStyle) {
      dispatch('initializeDefaultStyle', defaultStyle);
    }

    const options = await getAllOptions();
    if (!options.basicModeSections) {
      options.basicModeSections = defaultOptions.basicModeSections;
    }
    if (!options.layout) {
      options.layout = defaultOptions.layout;
    }
    if (!options.colorPalette) {
      options.colorPalette = defaultOptions.colorPalette;
    }
    if (!options.fonts) {
      options.fonts = defaultOptions.fonts;
    }
    if (options.darkMode === undefined) {
      options.darkMode = defaultOptions.darkMode;
    }

    commit('setOptions', options);

    const commands = await getCommands();
    commit('setCommands', commands);

    const readabilitySettings = await getReadabilitySettings();
    commit('setReadabilitySettings', readabilitySettings);

    initListeners(store);
  },

  async refreshDefaultStyle(
    { dispatch }: { dispatch: Dispatch }
  ): Promise<void> {
    const { defaultStyle } = await getStylesForPage(false);
    if (defaultStyle) {
      dispatch('initializeDefaultStyle', defaultStyle);
    }
  },

  initializeDefaultStyle(
    { commit }: { commit: Commit },
    defaultStyle: Style
  ): void {
    const { url, enabled, readability } = defaultStyle;
    const css = defaultStyle.css || '';

    commit('setUrl', url);
    commit('setCss', css);
    commit('setEnabled', enabled);
    commit('setReadability', readability);

    const root = safeParse(css);
    commit('setSelectors', root);
  },

  async openStylebot(
    { state, commit }: { state: State; commit: Commit },
    { inspect = false, store }: { inspect: boolean; store: Store<State> }
  ): Promise<void> {
    initEditor(store);

    if (!state.enabled) {
      enableStyle(state.url);
    }

    commit('setVisible', true);
    // Always open on the basic (visual) editor, never restore code/magic mode
    commit('setOptions', { ...state.options, mode: 'basic' });

    if (inspect) {
      commit('setInspecting', true);
    } else {
      const result = await chrome.storage.session.get('stylekit-inspecting');
      if (result['stylekit-inspecting']) {
        commit('setInspecting', true);
      }
    }
  },

  closeStylebot({ commit }: { commit: Commit }): void {
    commit('setVisible', false);
    chrome.storage.session.set({ 'stylekit-inspecting': false });
  },

  setMode(
    { state, commit }: { state: State; commit: Commit },
    mode: StylebotEditingMode
  ): void {
    setOption('mode', mode);
    commit('setOptions', { ...state.options, mode });
  },

  setLayout(
    { state, commit }: { state: State; commit: Commit },
    layout: StylebotLayout
  ): void {
    setOption('layout', layout);
    commit('setOptions', { ...state.options, layout });
  },

  setColorPalette(
    { state, commit }: { state: State; commit: Commit },
    colorPalette: StylebotColorPalette
  ): void {
    setOption('colorPalette', colorPalette);
    commit('setOptions', { ...state.options, colorPalette });
  },

  setBasicModeSections(
    { state, commit }: { state: State; commit: Commit },
    basicModeSections: StylebotBasicModeSections
  ): void {
    setOption('basicModeSections', basicModeSections);
    commit('setOptions', { ...state.options, basicModeSections });
  },

  setDarkMode(
    { state, commit }: { state: State; commit: Commit },
    darkMode: boolean
  ): void {
    setOption('darkMode', darkMode);
    commit('setOptions', { ...state.options, darkMode });
  },

  applyCss(
    { commit, state }: { commit: Commit; state: State },
    { css, skipHistory }: { css: string; skipHistory?: boolean }
  ): void {
    const root = safeParse(css);
    injectRootIntoDocument(root, state.url);

    commit('setCss', css);
    commit('setSelectors', root);

    if (!skipHistory) {
      commit('pushCssHistory', css);
    }

    // when saving, cleanup any empty rules
    const cleanCss = removeEmptyRules(css);
    setStyle(state.url, cleanCss, state.readability);
  },

  undo({ state, dispatch }: { state: State; dispatch: Dispatch }): void {
    if (state.cssHistoryIndex > 0) {
      const newIndex = state.cssHistoryIndex - 1;
      const css = state.cssHistory[newIndex];

      state.cssHistoryIndex = newIndex;
      dispatch('applyCss', { css, skipHistory: true });
    }
  },

  redo({ state, dispatch }: { state: State; dispatch: Dispatch }): void {
    if (state.cssHistoryIndex < state.cssHistory.length - 1) {
      const newIndex = state.cssHistoryIndex + 1;
      const css = state.cssHistory[newIndex];

      state.cssHistoryIndex = newIndex;
      dispatch('applyCss', { css, skipHistory: true });
    }
  },

  applyDeclaration(
    { state, dispatch }: { state: State; dispatch: Dispatch },
    { property, value }: { property: string; value: string }
  ): void {
    if (!state.activeSelector) {
      return;
    }

    const css = addDeclaration(
      property,
      value,
      state.activeSelector,
      state.css
    );

    dispatch('applyCss', { css });
  },

  async applyFontFamily(
    { state, dispatch }: { state: State; dispatch: Dispatch },
    value: string
  ): Promise<void> {
    let css = state.css;

    // Add @import for Google Web Font if needed
    if (value) {
      css = await addGoogleWebFont(value, css);
    }

    // Apply font-family declaration
    if (state.activeSelector) {
      css = addDeclaration('font-family', value, state.activeSelector, css);
    }

    // Clean up unused @import rules
    css = cleanGoogleWebFonts(css);

    // Single batched CSS update instead of 3 separate applyCss calls
    if (css !== state.css) {
      dispatch('applyCss', { css });
    }
  },

  applyReadability(
    { state, commit }: { state: State; commit: Commit },
    value: boolean
  ): void {
    if (value) {
      applyReadability(true);
    } else {
      removeReadability();
    }

    commit('setReadability', value);
    setReadability(state.url, value);
  },

  setReadabilitySettings(
    { commit }: { commit: Commit },
    value: ReadabilitySettings
  ): void {
    setReadabilitySettings(value);
    commit('setReadabilitySettings', value);
  },

  applyFilter(
    {
      state,
      dispatch,
    }: {
      state: State;
      dispatch: Dispatch;
    },
    {
      effectName,
      percent,
    }: {
      effectName: FilterEffect;
      percent: string;
    }
  ): void {
    dispatch('applyCss', {
      css: getCssAfterApplyingFilterEffectToPage(
        effectName,
        state.css,
        percent
      ),
    });
  },
};
