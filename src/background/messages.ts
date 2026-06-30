import { getCachedThumb, setCachedThumb } from './preloader';

import {
  set,
  get,
  disable,
  enable,
  getAll,
  setAll,
  move,
  getStylesForPage,
  getStylesForFrame,
  updateIcon,
  setReadability,
  getImportCss,
  applyStylesToAllTabs,
  createStylesRollbackSnapshot,
  getLastStylesRollbackSnapshot,
  restoreLastStylesRollbackSnapshot,
} from './styles';

import {
  get as getOption,
  getAll as getAllOptions,
  set as setOption,
} from './options';

import {
  GetOption as GetOptionType,
  SetOption as SetOptionType,
  DisableStyle as DisableStyleType,
  EnableStyle as EnableStyleType,
  SetStyle as SetStyleType,
  GetStylesForPage as GetStylesForPageType,
  GetStylesForIframe as GetStylesForIframeType,
  MoveStyle as MoveStyleType,
  SetAllStyles as SetAllStylesType,
  SetCommands as SetCommandsType,
  SetReadability as SetReadabilityType,
  SetReadabilitySettings as SetReadabilitySettingsType,
  GetImportCss as GetImportCssType,
  GetThumbnail as GetThumbnailType,
  RunGoogleDriveSync as RunGoogleDriveSyncType,
  GetLastStylesRollbackSnapshot as GetLastStylesRollbackSnapshotType,
  RestoreLastStylesRollbackSnapshot as RestoreLastStylesRollbackSnapshotType,
  GetEditorOnboardingDone as GetEditorOnboardingDoneType,
  SetEditorOnboardingDone as SetEditorOnboardingDoneType,
  GetGoogleFontsCache as GetGoogleFontsCacheType,
  SetGoogleFontsCache as SetGoogleFontsCacheType,
  ApplyPreviewStyleToTab as ApplyPreviewStyleToTabType,
  RemovePreviewStyleFromTab as RemovePreviewStyleFromTabType,
  GetCommandsResponse,
  GetAllOptionsResponse,
  GetAllStylesResponse,
  GetOptionResponse,
  GetStylesForPageResponse,
  GetReadabilitySettingsResponse,
  GetImportCssResponse,
  GetThumbnailResponse,
  RunGoogleDriveSyncResponse,
  SetAllStylesResponse,
  GetLastStylesRollbackSnapshotResponse,
  RestoreLastStylesRollbackSnapshotResponse,
  GetEditorOnboardingDoneResponse,
  SetEditorOnboardingDoneResponse,
  GetGoogleFontsCacheResponse,
  SetGoogleFontsCacheResponse,
} from '@stylekit/types';
import { runGoogleDriveSync } from '@stylekit/sync';
import {
  applyUserOriginPreviewToTab,
  applyUserOriginStylesToFrame,
  removeUserOriginPreviewFromTab,
  replaceUserOriginCss,
} from './style-applier';

import {
  get as getReadabilitySettings,
  set as setReadabilitySettings,
} from './readability-settings';

import { get as getCommands, set as setCommands } from './commands';

const ONBOARDING_KEY = 'stylekit-onboarding-done';
const GOOGLE_FONTS_CACHE_KEY = 'stylekit-google-fonts';

export const DisableStyle = async (
  message: DisableStyleType
): Promise<void> => {
  await disable(message.url);
  return applyStylesToAllTabs();
};

export const EnableStyle = async (message: EnableStyleType): Promise<void> => {
  await enable(message.url);
  return applyStylesToAllTabs();
};

export const SetStyle = async (
  message: SetStyleType,
  sender?: chrome.runtime.MessageSender
): Promise<void> => {
  const previousStyle = await get(message.url);
  await set(message.url, message.css, message.readability);

  if (sender?.tab?.id !== undefined) {
    await replaceUserOriginCss(
      {
        tabId: sender.tab.id,
        frameId: sender.frameId ?? 0,
      },
      message.url,
      previousStyle?.css,
      message.css
    );
  }
};

export const GetAllStyles = async (
  sendResponse: (response: GetAllStylesResponse) => void
): Promise<void> => {
  const styles = await getAll();
  sendResponse(styles);
};

export const SetAllStyles = async (
  message: SetAllStylesType,
  sendResponse: (response: SetAllStylesResponse) => void
): Promise<void> => {
  if (message.rollbackReason) {
    await createStylesRollbackSnapshot(message.rollbackReason);
  }

  await setAll(message.styles);
  await applyStylesToAllTabs();
  sendResponse();
};

export const GetStylesForIframe = async (
  message: GetStylesForIframeType,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: GetStylesForPageResponse) => void
): Promise<void> => {
  const styles = await getAll();
  const pageStyles = getStylesForFrame(
    message.url,
    message.parentUrl,
    styles,
    message.important
  );
  const tabId = sender.tab?.id;

  if (message.preferUserOrigin && tabId !== undefined) {
    const rawPageStyles = message.important
      ? getStylesForFrame(message.url, message.parentUrl, styles, false)
      : pageStyles;
    pageStyles.userOriginApplied = await applyUserOriginStylesToFrame(
      tabId,
      sender.frameId ?? 0,
      rawPageStyles.styles
    );
  }

  sendResponse(pageStyles);
};

export const GetStylesForPage = async (
  message: GetStylesForPageType,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: GetStylesForPageResponse) => void
): Promise<void> => {
  const tab = sender.tab || message.tab;

  if (!tab || !tab.url) {
    return;
  }

  const styles = await getAll();
  const response = getStylesForPage(tab.url, styles, message.important);

  if (message.preferUserOrigin && tab.id !== undefined) {
    const rawResponse = message.important
      ? getStylesForPage(tab.url, styles, false)
      : response;
    response.userOriginApplied = await applyUserOriginStylesToFrame(
      tab.id,
      sender.frameId ?? 0,
      rawResponse.styles
    );
  }

  updateIcon(tab, response.styles, response.defaultStyle);
  sendResponse(response);
};

export const MoveStyle = (message: MoveStyleType): void => {
  move(message.sourceUrl, message.destinationUrl);
};

export const GetOption = async (
  message: GetOptionType,
  sendResponse: (response: GetOptionResponse) => void
): Promise<void> => {
  const option = await getOption(message.optionName);
  sendResponse(option);
};

export const GetAllOptions = async (
  sendResponse: (response: GetAllOptionsResponse) => void
): Promise<void> => {
  const options = await getAllOptions();
  sendResponse(options);
};

export const OpenOptionsPage = (): void => {
  chrome.runtime.openOptionsPage();
};

export const OpenDonatePage = (): void => {
  chrome.tabs.create({ url: 'https://github.com/SysAdminDoc/StyleKit' });
};

export const SetOption = (message: SetOptionType): void => {
  setOption(message.option.name, message.option.value);
};

export const GetCommands = async (
  sendResponse: (response: GetCommandsResponse) => void
): Promise<void> => {
  const commands = await getCommands();
  sendResponse(commands);
};

export const SetCommands = (message: SetCommandsType): void => {
  setCommands(message.value);
};

export const SetReadability = (message: SetReadabilityType): void => {
  setReadability(message.url, message.value);
};

export const GetReadabilitySettings = async (
  sendResponse: (response: GetReadabilitySettingsResponse) => void
): Promise<void> => {
  const settings = await getReadabilitySettings();
  sendResponse(settings);
};

export const SetReadabilitySettings = (
  message: SetReadabilitySettingsType
): void => {
  setReadabilitySettings(message.value);
};

export const GetImportCss = async (
  message: GetImportCssType,

  sendResponse: (response: GetImportCssResponse) => void
): Promise<void> => {
  const css = await getImportCss(message.url);
  sendResponse(css);
};

export const GetThumbnail = async (
  message: GetThumbnailType,
  sendResponse: (response: GetThumbnailResponse) => void
): Promise<void> => {
  // Return from cache if available
  if (message.styleId !== undefined) {
    const cached = await getCachedThumb(message.styleId);
    if (cached) { sendResponse(cached); return; }
  }

  try {
    const thumbUrl = new URL(message.url);
    if (!['https://userstyles.world', 'https://img.userstyles.world'].some(
      origin => thumbUrl.origin === origin || thumbUrl.origin.endsWith('.userstyles.world')
    )) {
      sendResponse(''); return;
    }
    const res = await fetch(message.url, { referrerPolicy: 'no-referrer' });
    if (!res.ok) { sendResponse(''); return; }
    const buffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const CHUNK = 8192;
    let binary = '';
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode(...(Array.from(uint8.subarray(i, i + CHUNK))));
    }
    const contentType = res.headers.get('content-type') || 'image/png';
    const dataUrl = `data:${contentType};base64,${btoa(binary)}`;
    if (message.styleId !== undefined) {
      setCachedThumb(message.styleId, dataUrl);
    }
    sendResponse(dataUrl);
  } catch {
    sendResponse('');
  }
};

export const RunGoogleDriveSync = async (
  _message: RunGoogleDriveSyncType,
  sendResponse: (response: RunGoogleDriveSyncResponse) => void
): Promise<void> => {
  const report = await runGoogleDriveSync();
  sendResponse(report);
};

export const GetLastStylesRollbackSnapshot = async (
  _message: GetLastStylesRollbackSnapshotType,
  sendResponse: (response: GetLastStylesRollbackSnapshotResponse) => void
): Promise<void> => {
  const snapshot = await getLastStylesRollbackSnapshot();
  sendResponse(snapshot);
};

export const RestoreLastStylesRollbackSnapshot = async (
  _message: RestoreLastStylesRollbackSnapshotType,
  sendResponse: (response: RestoreLastStylesRollbackSnapshotResponse) => void
): Promise<void> => {
  const snapshot = await restoreLastStylesRollbackSnapshot();

  if (snapshot) {
    await applyStylesToAllTabs();
  }

  sendResponse(snapshot);
};

export const GetEditorOnboardingDone = async (
  _message: GetEditorOnboardingDoneType,
  sendResponse: (response: GetEditorOnboardingDoneResponse) => void
): Promise<void> => {
  const items = await chrome.storage.local.get(ONBOARDING_KEY);
  sendResponse(Boolean(items[ONBOARDING_KEY]));
};

export const SetEditorOnboardingDone = async (
  message: SetEditorOnboardingDoneType,
  sendResponse: (response: SetEditorOnboardingDoneResponse) => void
): Promise<void> => {
  await chrome.storage.local.set({ [ONBOARDING_KEY]: message.value });
  sendResponse();
};

export const GetGoogleFontsCache = async (
  _message: GetGoogleFontsCacheType,
  sendResponse: (response: GetGoogleFontsCacheResponse) => void
): Promise<void> => {
  const items = await chrome.storage.local.get(GOOGLE_FONTS_CACHE_KEY);
  sendResponse(items[GOOGLE_FONTS_CACHE_KEY] || null);
};

export const SetGoogleFontsCache = async (
  message: SetGoogleFontsCacheType,
  sendResponse: (response: SetGoogleFontsCacheResponse) => void
): Promise<void> => {
  await chrome.storage.local.set({ [GOOGLE_FONTS_CACHE_KEY]: message.value });
  sendResponse();
};

export const ApplyPreviewStyleToTab = async (
  message: ApplyPreviewStyleToTabType,
  sendResponse: () => void
): Promise<void> => {
  const applied = await applyUserOriginPreviewToTab(
    message.tabId,
    message.id,
    message.css
  );

  if (!applied) {
    await chrome.tabs
      .sendMessage(message.tabId, {
        name: 'PreviewStyle',
        id: message.id,
        css: message.css,
      })
      .catch(() => undefined);
  }

  sendResponse();
};

export const RemovePreviewStyleFromTab = async (
  message: RemovePreviewStyleFromTabType,
  sendResponse: () => void
): Promise<void> => {
  await removeUserOriginPreviewFromTab(message.tabId, message.id);
  await chrome.tabs
    .sendMessage(message.tabId, {
      name: 'RemovePreviewStyle',
      id: message.id,
    })
    .catch(() => undefined);

  sendResponse();
};
