import {
  StylebotOptions,
  StylebotCommands,
  GoogleFontsCache,
  ReadabilitySettings,
  StyleMap,
  StylesRollbackReason,
  DiagnosticCategory,
} from '@stylekit/types';

export type SetStyle = {
  name: 'SetStyle';
  url: string;
  css: string;
  readability: boolean;
  shadowRoots?: boolean;
};

export type SetStyleShadowRoots = {
  name: 'SetStyleShadowRoots';
  url: string;
  enabled: boolean;
};

export type EnableStyle = {
  name: 'EnableStyle';
  url: string;
};

export type DisableStyle = {
  name: 'DisableStyle';
  url: string;
};

export type GetAllStyles = {
  name: 'GetAllStyles';
};

export type SetAllStyles = {
  name: 'SetAllStyles';
  styles: StyleMap;
  shouldPersist?: boolean;
  rollbackReason?: StylesRollbackReason;
};

export type MoveStyle = {
  name: 'MoveStyle';
  sourceUrl: string;
  destinationUrl: string;
};

export type GetStylesForPage = {
  name: 'GetStylesForPage';
  tab?: chrome.tabs.Tab;
  important?: boolean;
  preferUserOrigin?: boolean;
};

export type GetStylesForIframe = {
  name: 'GetStylesForIframe';
  url: string;
  parentUrl?: string;
  important?: boolean;
  preferUserOrigin?: boolean;
};

export type GetAllOptions = {
  name: 'GetAllOptions';
};

export type GetOption = {
  name: 'GetOption';
  optionName: keyof StylebotOptions;
};

export type SetOption = {
  name: 'SetOption';
  option: {
    name: keyof StylebotOptions;
    value: StylebotOptions[keyof StylebotOptions]; // todo
  };
};

export type OpenOptionsPage = {
  name: 'OpenOptionsPage';
};

export type OpenDonatePage = {
  name: 'OpenDonatePage';
};

export type SetReadability = {
  name: 'SetReadability';
  url: string;
  value: boolean;
};

export type GetCommands = {
  name: 'GetCommands';
};

export type SetCommands = {
  name: 'SetCommands';
  value: StylebotCommands;
};

export type GetReadabilitySettings = {
  name: 'GetReadabilitySettings';
};

export type SetReadabilitySettings = {
  name: 'SetReadabilitySettings';
  value: ReadabilitySettings;
};

export type GetImportCss = {
  name: 'GetImportCss';
  url: string;
};

export type RunGoogleDriveSync = {
  name: 'RunGoogleDriveSync';
};

export type GetLastStylesRollbackSnapshot = {
  name: 'GetLastStylesRollbackSnapshot';
};

export type RestoreLastStylesRollbackSnapshot = {
  name: 'RestoreLastStylesRollbackSnapshot';
};

export type GetThumbnail = {
  name: 'GetThumbnail';
  url: string;
  styleId?: number;
};

export type GetEditorOnboardingDone = {
  name: 'GetEditorOnboardingDone';
};

export type SetEditorOnboardingDone = {
  name: 'SetEditorOnboardingDone';
  value: boolean;
};

export type GetGoogleFontsCache = {
  name: 'GetGoogleFontsCache';
};

export type SetGoogleFontsCache = {
  name: 'SetGoogleFontsCache';
  value: GoogleFontsCache;
};

export type ApplyPreviewStyleToTab = {
  name: 'ApplyPreviewStyleToTab';
  tabId: number;
  id: string;
  css: string;
};

export type RemovePreviewStyleFromTab = {
  name: 'RemovePreviewStyleFromTab';
  tabId: number;
  id: string;
};

export type GetUserstylesIndex = {
  name: 'GetUserstylesIndex';
};

export type GetUserstylesProviderHealth = {
  name: 'GetUserstylesProviderHealth';
};

export type ReportUserstylesProviderError = {
  name: 'ReportUserstylesProviderError';
  operation: string;
  errorMessage: string;
};

export type RecordDiagnostic = {
  name: 'RecordDiagnostic';
  category: DiagnosticCategory;
  operation: string;
  errorMessage: string;
  level?: 'warning' | 'error';
};

export type GetDiagnosticsBundle = {
  name: 'GetDiagnosticsBundle';
};

type BackgroundPageMessage =
  | SetStyle
  | SetStyleShadowRoots
  | EnableStyle
  | DisableStyle
  | GetAllStyles
  | SetAllStyles
  | MoveStyle
  | GetStylesForPage
  | GetStylesForIframe
  | GetAllOptions
  | GetOption
  | SetOption
  | OpenOptionsPage
  | OpenDonatePage
  | SetReadability
  | GetCommands
  | SetCommands
  | GetReadabilitySettings
  | SetReadabilitySettings
  | GetImportCss
  | RunGoogleDriveSync
  | GetLastStylesRollbackSnapshot
  | RestoreLastStylesRollbackSnapshot
  | GetThumbnail
  | GetEditorOnboardingDone
  | SetEditorOnboardingDone
  | GetGoogleFontsCache
  | SetGoogleFontsCache
  | ApplyPreviewStyleToTab
  | RemovePreviewStyleFromTab
  | GetUserstylesIndex
  | GetUserstylesProviderHealth
  | ReportUserstylesProviderError
  | RecordDiagnostic
  | GetDiagnosticsBundle;

export default BackgroundPageMessage;
