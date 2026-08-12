import {
  Style,
  StylebotOptions,
  StylebotCommands,
  GoogleFontsCache,
  ReadabilitySettings,
  Timestamp,
  StylesRollbackSnapshot,
  GoogleDriveSyncReport,
  GetUserstylesIndexResponse,
  UserstylesProviderHealth,
  DiagnosticsBundle,
} from '@stylekit/types';

export type GetAllOptionsResponse = StylebotOptions;
export type GetOptionResponse = StylebotOptions[keyof StylebotOptions];

export type GetAllStylesResponse = {
  [url: string]: {
    css: string;
    enabled: boolean;
    readability: boolean;
    shadowRoots?: boolean;
    modifiedTime: Timestamp;
  };
};

export type GetStylesForPageResponse = {
  styles: Array<Style>;
  defaultStyle?: Style;
  userOriginApplied?: boolean;
  frameMatchUrl?: string;
  frameMatchSource?: 'top-frame' | 'frame-url' | 'parent-url' | 'blocked';
  frameBlockedReason?: string;
};

export type GetCommandsResponse = StylebotCommands;
export type GetReadabilitySettingsResponse = ReadabilitySettings;

export type GetImportCssResponse = string;
export type GetThumbnailResponse = string;
export type RunGoogleDriveSyncResponse = GoogleDriveSyncReport;
export type SetAllStylesResponse = void;
export type GetLastStylesRollbackSnapshotResponse =
  StylesRollbackSnapshot | null;
export type RestoreLastStylesRollbackSnapshotResponse =
  StylesRollbackSnapshot | null;
export type GetEditorOnboardingDoneResponse = boolean;
export type SetEditorOnboardingDoneResponse = void;
export type GetGoogleFontsCacheResponse = GoogleFontsCache | null;
export type SetGoogleFontsCacheResponse = void;
export type GetUserstylesProviderHealthResponse = UserstylesProviderHealth;
export type GetDiagnosticsBundleResponse = DiagnosticsBundle;
export type RecordDiagnosticResponse = void;

type BackgroundPageMessageResponse =
  | GetAllOptionsResponse
  | GetOptionResponse
  | GetAllStylesResponse
  | GetStylesForPageResponse
  | GetCommandsResponse
  | GetReadabilitySettingsResponse
  | GetImportCssResponse
  | GetThumbnailResponse
  | RunGoogleDriveSyncResponse
  | SetAllStylesResponse
  | GetLastStylesRollbackSnapshotResponse
  | RestoreLastStylesRollbackSnapshotResponse
  | GetEditorOnboardingDoneResponse
  | SetEditorOnboardingDoneResponse
  | GetGoogleFontsCacheResponse
  | SetGoogleFontsCacheResponse
  | GetUserstylesProviderHealthResponse
  | GetUserstylesIndexResponse
  | GetDiagnosticsBundleResponse
  | RecordDiagnosticResponse;

export default BackgroundPageMessageResponse;
