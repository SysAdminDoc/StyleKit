import { Store } from 'vuex';

import { State } from 'editor/store';
import { TabMessage } from '@stylekit/types';

import { apply as applyReadability } from '@stylekit/readability';

import {
  applyStyles,
  toggleStylebot,
  toggleReadability,
  updateSelectorWithContextMenuSelector,
} from './common';

const initChromeListener = (store: Store<State>): void => {
  const { state, commit, dispatch } = store;

  chrome.runtime.onMessage.addListener(
    (message: TabMessage, _, sendResponse: (response: boolean) => void) => {
      if (window !== window.top) {
        return;
      }

      if (message.name === 'ToggleStylebot') {
        toggleStylebot(store);
      } else if (message.name === 'OpenStylebot') {
        if (!state.visible) {
          toggleStylebot(store);
        }
      } else if (message.name === 'OpenStylebotInCodeMode') {
        dispatch('refreshDefaultStyle').then(() => {
          dispatch('setMode', 'code');
          if (!state.visible) {
            toggleStylebot(store);
          }
        });
      } else if (message.name === 'OpenStylebotFromContextMenu') {
        updateSelectorWithContextMenuSelector({ state, commit });

        if (!state.visible) {
          toggleStylebot(store, false);
        }
      } else if (message.name === 'HideElementFromContextMenu') {
        if (state.contextMenuSelector) {
          commit('setActiveSelector', state.contextMenuSelector);
          dispatch('applyDeclaration', {
            property: 'display',
            value: 'none',
          });
        }
      } else if (message.name === 'GetIsStylebotOpen') {
        sendResponse(state.visible);
      } else if (message.name === 'TabUpdated') {
        if (state.readability) {
          applyReadability();
        }
      } else if (message.name === 'ToggleReadabilityForTab') {
        toggleReadability({ state, dispatch });
      } else if (message.name === 'ApplyStylesToTab') {
        applyStyles({ dispatch }, message.defaultStyle, message.styles);
      } else if ((message as any).name === 'PreviewStyle') {
        const id = `stylekit-preview-${(message as any).id}`;
        let el = document.getElementById(id) as HTMLStyleElement | null;
        if (!el) {
          el = document.createElement('style');
          el.id = id;
          document.documentElement.appendChild(el);
        }
        el.textContent = (message as any).css;
      } else if ((message as any).name === 'RemovePreviewStyle') {
        const el = document.getElementById(`stylekit-preview-${(message as any).id}`);
        if (el) el.remove();
      }
    }
  );
};

export default initChromeListener;
