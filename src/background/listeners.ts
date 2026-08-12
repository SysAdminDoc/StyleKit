import ContextMenu from './contextmenu';
import { preloadForDomain } from './preloader';

import {
  GetCommands,
  SetCommands,
  GetOption,
  SetOption,
  GetAllOptions,
  OpenOptionsPage,
  OpenDonatePage,
  SetStyle,
  SetStyleShadowRoots,
  MoveStyle,
  GetAllStyles,
  SetAllStyles,
  GetStylesForPage,
  GetStylesForIframe,
  EnableStyle,
  DisableStyle,
  SetReadability,
  GetReadabilitySettings,
  SetReadabilitySettings,
  GetImportCss,
  GetThumbnail,
  RunGoogleDriveSync,
  GetLastStylesRollbackSnapshot,
  RestoreLastStylesRollbackSnapshot,
  GetEditorOnboardingDone,
  SetEditorOnboardingDone,
  GetGoogleFontsCache,
  SetGoogleFontsCache,
  ApplyPreviewStyleToTab,
  RemovePreviewStyleFromTab,
  GetUserstylesIndex,
  GetUserstylesProviderHealth,
  ReportUserstylesProviderError,
  RecordDiagnostic,
  GetDiagnosticsBundle,
} from './messages';

import { get as getOption } from './options';

import {
  TabUpdated,
  BackgroundPageMessage,
  BackgroundPageMessageResponse,
} from '@stylekit/types';

import { setNotification } from '@stylekit/utils';

/**
 * Open Help page on installation
 */
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({
      url: 'options/index.html',
    });

    setNotification('release/3.1', true);
  }
});

/**
 * When an existing tab is updated, refresh the context-menu and action.
 */
chrome.tabs.onUpdated.addListener(async (tabId, _, tab) => {
  const option = await getOption('contextMenu');

  if (option && tab.status === 'complete') {
    ContextMenu.update(tab);

    const autoLoad = await getOption('autoLoadStyles');
    if (
      autoLoad &&
      tab.url &&
      !tab.url.startsWith('chrome') &&
      !tab.url.startsWith('edge')
    ) {
      try {
        const domain = new URL(tab.url).hostname;
        preloadForDomain(domain);
      } catch {
        /* ignore invalid URLs */
      }
    }

    const message: TabUpdated = {
      name: 'TabUpdated',
    };

    if (!tab.url?.includes('chrome-extension://')) {
      chrome.tabs.sendMessage(tabId, message).catch(() => undefined);
    }
  }
});

/**
 * Listen when a tab is activated to refresh the context-menu.
 */
chrome.tabs.onActivated.addListener(async activeInfo => {
  const option = await getOption('contextMenu');

  if (option) {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    ContextMenu.update(tab);
  }
});

// Messages that call sendResponse asynchronously — port must stay open
const ASYNC_MESSAGES = new Set([
  'GetCommands',
  'GetOption',
  'GetAllOptions',
  'GetAllStyles',
  'GetStylesForPage',
  'GetStylesForIframe',
  'GetReadabilitySettings',
  'GetImportCss',
  'GetThumbnail',
  'RunGoogleDriveSync',
  'SetAllStyles',
  'SetEditorOnboardingDone',
  'GetEditorOnboardingDone',
  'SetGoogleFontsCache',
  'GetGoogleFontsCache',
  'GetLastStylesRollbackSnapshot',
  'RestoreLastStylesRollbackSnapshot',
  'ApplyPreviewStyleToTab',
  'RemovePreviewStyleFromTab',
  'GetUserstylesIndex',
  'GetUserstylesProviderHealth',
  'ReportUserstylesProviderError',
  'RecordDiagnostic',
  'GetDiagnosticsBundle',
]);

chrome.runtime.onMessage.addListener(
  (
    message: BackgroundPageMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: BackgroundPageMessageResponse) => void
  ) => {
    // Only accept messages from our own extension
    if (sender.id !== chrome.runtime.id) {
      return;
    }

    switch (message.name) {
      case 'GetCommands':
        GetCommands(sendResponse);
        break;
      case 'SetCommands':
        SetCommands(message);
        break;

      case 'GetOption':
        GetOption(message, sendResponse);
        break;
      case 'SetOption':
        SetOption(message);
        break;
      case 'GetAllOptions':
        GetAllOptions(sendResponse);
        break;

      case 'OpenOptionsPage':
        OpenOptionsPage();
        break;
      case 'OpenDonatePage':
        OpenDonatePage();
        break;

      case 'SetStyle':
        SetStyle(message, sender);
        break;
      case 'SetStyleShadowRoots':
        SetStyleShadowRoots(message);
        break;
      case 'MoveStyle':
        MoveStyle(message);
        break;
      case 'GetAllStyles':
        GetAllStyles(sendResponse);
        break;
      case 'SetAllStyles':
        SetAllStyles(message, sendResponse);
        break;
      case 'GetStylesForPage':
        GetStylesForPage(message, sender, sendResponse);
        break;
      case 'GetStylesForIframe':
        GetStylesForIframe(message, sender, sendResponse);
        break;
      case 'EnableStyle':
        EnableStyle(message);
        break;
      case 'DisableStyle':
        DisableStyle(message);
        break;

      case 'SetReadability':
        SetReadability(message);
        break;
      case 'GetReadabilitySettings':
        GetReadabilitySettings(sendResponse);
        break;
      case 'SetReadabilitySettings':
        SetReadabilitySettings(message);
        break;

      case 'GetImportCss':
        GetImportCss(message, sendResponse);
        break;

      case 'GetThumbnail':
        GetThumbnail(message, sendResponse);
        break;

      case 'RunGoogleDriveSync':
        RunGoogleDriveSync(message, sendResponse);
        break;

      case 'GetLastStylesRollbackSnapshot':
        GetLastStylesRollbackSnapshot(message, sendResponse);
        break;

      case 'RestoreLastStylesRollbackSnapshot':
        RestoreLastStylesRollbackSnapshot(message, sendResponse);
        break;

      case 'GetEditorOnboardingDone':
        GetEditorOnboardingDone(message, sendResponse);
        break;
      case 'SetEditorOnboardingDone':
        SetEditorOnboardingDone(message, sendResponse);
        break;
      case 'GetGoogleFontsCache':
        GetGoogleFontsCache(message, sendResponse);
        break;
      case 'SetGoogleFontsCache':
        SetGoogleFontsCache(message, sendResponse);
        break;
      case 'ApplyPreviewStyleToTab':
        ApplyPreviewStyleToTab(message, sendResponse);
        break;
      case 'RemovePreviewStyleFromTab':
        RemovePreviewStyleFromTab(message, sendResponse);
        break;
      case 'GetUserstylesIndex':
        GetUserstylesIndex(sendResponse);
        break;
      case 'GetUserstylesProviderHealth':
        GetUserstylesProviderHealth(sendResponse);
        break;
      case 'ReportUserstylesProviderError':
        ReportUserstylesProviderError(message, sendResponse);
        break;
      case 'RecordDiagnostic':
        RecordDiagnostic(message, sendResponse);
        break;
      case 'GetDiagnosticsBundle':
        GetDiagnosticsBundle(message, sendResponse);
        break;
    }

    return ASYNC_MESSAGES.has(message.name);
  }
);
