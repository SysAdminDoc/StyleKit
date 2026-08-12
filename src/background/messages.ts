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
  setShadowRoots,
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
  GetStyleVersion as GetStyleVersionType,
  SetStyleShadowRoots as SetStyleShadowRootsType,
  PreviewStyleSource as PreviewStyleSourceType,
  SetStyleSource as SetStyleSourceType,
  ReloadStyleSource as ReloadStyleSourceType,
  RollbackStyleSource as RollbackStyleSourceType,
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
  ReportUserstylesProviderError as ReportUserstylesProviderErrorType,
  RecordDiagnostic as RecordDiagnosticType,
  GetDiagnosticsBundle as GetDiagnosticsBundleType,
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
  GetUserstylesIndexResponse,
  GetUserstylesProviderHealthResponse,
  GetDiagnosticsBundleResponse,
  RecordDiagnosticResponse,
  PreviewStyleSourceResponse,
  SetStyleSourceResponse,
  ReloadStyleSourceResponse,
  RollbackStyleSourceResponse,
  GetStyleSourceStatusesResponse,
} from '@stylekit/types';
import { runGoogleDriveSync } from '@stylekit/sync';
import {
  applyUserOriginPreviewToTab,
  applyUserOriginStylesToFrame,
  removeUserOriginPreviewFromTab,
  replaceUserOriginCss,
} from './style-applier';
import {
  getUserstylesIndex,
  getUserstylesProviderHealth,
  recordUserstylesProviderFailure,
} from './userstyles-provider';
import { getDiagnosticsBundle, recordDiagnostic } from './diagnostics';
import {
  GOOGLE_FONTS_METADATA_URL,
  parseGoogleFontsMetadata,
} from './google-fonts';
import {
  configureStyleSource,
  getStyleSourceStatuses,
  previewStyleSource,
  reloadStyleSource,
  rollbackStyleSource,
} from './style-source';
import {
  getStyleVersion,
  recordStyleVersion,
} from './style-versions';

import {
  get as getReadabilitySettings,
  set as setReadabilitySettings,
} from './readability-settings';

import { get as getCommands, set as setCommands } from './commands';

const ONBOARDING_KEY = 'stylekit-onboarding-done';
const GOOGLE_FONTS_CACHE_KEY = 'stylekit-google-fonts';
const GOOGLE_FONTS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const GOOGLE_FONTS_MAX_BYTES = 10 * 1024 * 1024;

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
  if (previousStyle?.css !== message.css) {
    await recordStyleVersion(
      message.url,
      previousStyle?.css || '',
      message.css,
      previousStyle?.modifiedTime || new Date().toISOString()
    ).catch(() => undefined);
  }
  await set(message.url, message.css, message.readability, message.shadowRoots);

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
    const allStyles = await getAll();
    const pageStyles = getStylesForPage(
      sender.tab.url || message.url,
      allStyles
    );
    chrome.tabs.sendMessage(sender.tab.id, {
      name: 'ApplyStylesToTab',
      ...pageStyles,
      userOriginApplied: true,
    });
  } else {
    await applyStylesToAllTabs();
  }
};

export const GetStyleVersion = async (
  message: GetStyleVersionType,
  sendResponse: (response: Awaited<ReturnType<typeof getStyleVersion>>) => void
): Promise<void> => {
  sendResponse(await getStyleVersion(message.url));
};

export const SetStyleShadowRoots = async (
  message: SetStyleShadowRootsType
): Promise<void> => {
  await setShadowRoots(message.url, message.enabled);
  await applyStylesToAllTabs();
};

const sourceErrorResponse = (error: unknown): ReloadStyleSourceResponse => ({
  state: 'error',
  lastCheckedAt: new Date().toISOString(),
  lastError: error instanceof Error ? error.message : String(error),
  rollbackAvailable: false,
});

export const PreviewStyleSource = async (
  message: PreviewStyleSourceType,
  sendResponse: (response: PreviewStyleSourceResponse) => void
): Promise<void> => {
  try {
    sendResponse({ css: await previewStyleSource(message.sourceUrl) });
  } catch (error) {
    await recordDiagnostic({
      category: 'import',
      operation: 'live-source-preview',
      error,
    }).catch(() => undefined);
    sendResponse({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const SetStyleSource = async (
  message: SetStyleSourceType,
  sendResponse: (response: SetStyleSourceResponse) => void
): Promise<void> => {
  try {
    await configureStyleSource(message.url, message.source);
    sendResponse({});
  } catch (error) {
    sendResponse({
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const ReloadStyleSource = async (
  message: ReloadStyleSourceType,
  sendResponse: (response: ReloadStyleSourceResponse) => void
): Promise<void> => {
  try {
    sendResponse(await reloadStyleSource(message.url));
  } catch (error) {
    sendResponse(sourceErrorResponse(error));
  }
};

export const RollbackStyleSource = async (
  message: RollbackStyleSourceType,
  sendResponse: (response: RollbackStyleSourceResponse) => void
): Promise<void> => {
  try {
    sendResponse(await rollbackStyleSource(message.url));
  } catch (error) {
    sendResponse(sourceErrorResponse(error));
  }
};

export const GetStyleSourceStatuses = async (
  sendResponse: (response: GetStyleSourceStatusesResponse) => void
): Promise<void> => {
  sendResponse(await getStyleSourceStatuses());
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
  try {
    if (message.rollbackReason) {
      await createStylesRollbackSnapshot(message.rollbackReason);
    }

    await setAll(message.styles);
    await applyStylesToAllTabs();
    sendResponse();
  } catch (error) {
    if (message.rollbackReason) {
      await recordDiagnostic({
        category: 'import',
        operation: message.rollbackReason,
        error,
      }).catch(() => undefined);
    }
    throw error;
  }
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
  try {
    const css = await getImportCss(message.url);
    sendResponse(css);
  } catch (error) {
    await recordDiagnostic({
      category: 'import',
      operation: 'remote-css-fetch',
      error,
    }).catch(() => undefined);
    throw error;
  }
};

export const GetThumbnail = async (
  message: GetThumbnailType,
  sendResponse: (response: GetThumbnailResponse) => void
): Promise<void> => {
  // Return from cache if available
  if (message.styleId !== undefined) {
    const cached = await getCachedThumb(message.styleId);
    if (cached) {
      sendResponse(cached);
      return;
    }
  }

  try {
    const thumbUrl = new URL(message.url);
    if (
      !['https://userstyles.world', 'https://img.userstyles.world'].some(
        origin =>
          thumbUrl.origin === origin ||
          thumbUrl.origin.endsWith('.userstyles.world')
      )
    ) {
      sendResponse('');
      return;
    }
    const res = await fetch(message.url, { referrerPolicy: 'no-referrer' });
    if (!res.ok) {
      sendResponse('');
      return;
    }
    const buffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const CHUNK = 8192;
    let binary = '';
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode(
        ...Array.from(uint8.subarray(i, i + CHUNK))
      );
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
  try {
    const report = await runGoogleDriveSync();
    sendResponse(report);
  } catch (error) {
    await recordDiagnostic({
      category: 'sync',
      operation: 'google-drive',
      error,
    }).catch(() => undefined);
    throw error;
  }
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
  const cached = items[GOOGLE_FONTS_CACHE_KEY] as
    | GetGoogleFontsCacheResponse
    | undefined;
  if (cached && cached.axes && Date.now() - cached.ts < GOOGLE_FONTS_TTL_MS) {
    sendResponse(cached);
    return;
  }

  try {
    const response = await fetch(GOOGLE_FONTS_METADATA_URL, {
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) {
      throw new Error(`Google Fonts HTTP ${response.status}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error(
        `Google Fonts returned ${contentType || 'unknown content'}`
      );
    }
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > GOOGLE_FONTS_MAX_BYTES) {
      throw new Error('Google Fonts metadata exceeds the 10 MB limit.');
    }
    const catalog = parseGoogleFontsMetadata(text);
    await chrome.storage.local.set({ [GOOGLE_FONTS_CACHE_KEY]: catalog });
    sendResponse(catalog);
  } catch (error) {
    await recordDiagnostic({
      category: 'fonts',
      operation: 'catalog-fetch',
      error,
      level: 'warning',
    }).catch(() => undefined);
    sendResponse(cached || null);
  }
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

export const GetUserstylesIndex = async (
  sendResponse: (response: GetUserstylesIndexResponse) => void
): Promise<void> => {
  const response = await getUserstylesIndex();
  sendResponse(response);
};

export const GetUserstylesProviderHealth = async (
  sendResponse: (response: GetUserstylesProviderHealthResponse) => void
): Promise<void> => {
  const response = await getUserstylesProviderHealth();
  sendResponse(response);
};

export const ReportUserstylesProviderError = async (
  message: ReportUserstylesProviderErrorType,
  sendResponse: (response: GetUserstylesProviderHealthResponse) => void
): Promise<void> => {
  const response = await recordUserstylesProviderFailure(
    message.operation,
    message.errorMessage
  );
  sendResponse(response);
};

export const RecordDiagnostic = async (
  message: RecordDiagnosticType,
  sendResponse: (response: RecordDiagnosticResponse) => void
): Promise<void> => {
  await recordDiagnostic({
    category: message.category,
    operation: message.operation,
    error: message.errorMessage,
    level: message.level,
  });
  sendResponse();
};

export const GetDiagnosticsBundle = async (
  _message: GetDiagnosticsBundleType,
  sendResponse: (response: GetDiagnosticsBundleResponse) => void
): Promise<void> => {
  sendResponse(await getDiagnosticsBundle());
};
