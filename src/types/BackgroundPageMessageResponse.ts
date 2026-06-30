import {
  Style,
  StylebotOptions,
  StylebotCommands,
  GoogleFontsCache,
  ReadabilitySettings,
  Timestamp,
  StylesRollbackSnapshot,
  GoogleDriveSyncReport,
} from '@stylekit/types';

export type GetAllOptionsResponse = StylebotOptions;
export type GetOptionResponse = StylebotOptions[keyof StylebotOptions];

export type GetAllStylesResponse = {
  [url: string]: {
    css: string;
    enabled: boolean;
    readability: boolean;
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
  | SetGoogleFontsCacheResponse;

export default BackgroundPageMessageResponse;
