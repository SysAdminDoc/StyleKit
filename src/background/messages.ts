import { getCachedThumb, setCachedThumb } from './preloader';

import {
  set,
  disable,
  enable,
  getAll,
  setAll,
  move,
  getStylesForPage,
  updateIcon,
  setReadability,
  getImportCss,
  applyStylesToAllTabs,
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
  GetCommandsResponse,
  GetAllOptionsResponse,
  GetAllStylesResponse,
  GetOptionResponse,
  GetStylesForPageResponse,
  GetReadabilitySettingsResponse,
  GetImportCssResponse,
  GetThumbnailResponse,
  RunGoogleDriveSyncResponse,
} from '@stylebot/types';
import { runGoogleDriveSync } from '@stylebot/sync';

import {
  get as getReadabilitySettings,
  set as setReadabilitySettings,
} from './readability-settings';

import { get as getCommands, set as setCommands } from './commands';

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

export const SetStyle = (message: SetStyleType): Promise<void> =>
  set(message.url, message.css, message.readability);

export const GetAllStyles = async (
  sendResponse: (response: GetAllStylesResponse) => void
): Promise<void> => {
  const styles = await getAll();
  sendResponse(styles);
};

export const SetAllStyles = async (
  message: SetAllStylesType
): Promise<void> => {
  await setAll(message.styles);
  return applyStylesToAllTabs();
};

export const GetStylesForIframe = async (
  message: GetStylesForIframeType,
  sendResponse: (response: GetStylesForPageResponse) => void
): Promise<void> => {
  const styles = await getAll();
  const pageStyles = getStylesForPage(message.url, styles, message.important);

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
  await runGoogleDriveSync();
  sendResponse();
};
