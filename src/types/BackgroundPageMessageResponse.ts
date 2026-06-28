import {
  Style,
  StylebotOptions,
  StylebotCommands,
  ReadabilitySettings,
  Timestamp,
  StylesRollbackSnapshot,
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
};

export type GetCommandsResponse = StylebotCommands;
export type GetReadabilitySettingsResponse = ReadabilitySettings;

export type GetImportCssResponse = string;
export type GetThumbnailResponse = string;
export type RunGoogleDriveSyncResponse = void;
export type SetAllStylesResponse = void;
export type GetLastStylesRollbackSnapshotResponse =
  StylesRollbackSnapshot | null;
export type RestoreLastStylesRollbackSnapshotResponse =
  StylesRollbackSnapshot | null;

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
  | RestoreLastStylesRollbackSnapshotResponse;

export default BackgroundPageMessageResponse;
