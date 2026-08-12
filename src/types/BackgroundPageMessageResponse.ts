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
  StyleSourcePreview,
  StyleSourceStatus,
  StyleSourceStatusMap,
  StyleVersionSnapshot,
  UserRecipesResponse,
  RecipeMarketplaceResponse,
  CollaborativePacksResponse,
  CollaborativePackExportResponse,
  TeamSpacesResponse,
  TeamSpaceExportResponse,
  RemoteSyncSettingsResponse,
  RemoteSyncRunResponse,
  SelectiveSyncConfigResponse,
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
export type PreviewStyleSourceResponse = StyleSourcePreview;
export type SetStyleSourceResponse = StyleSourcePreview;
export type ReloadStyleSourceResponse = StyleSourceStatus;
export type RollbackStyleSourceResponse = StyleSourceStatus;
export type GetStyleSourceStatusesResponse = StyleSourceStatusMap;
export type GetStyleVersionResponse = StyleVersionSnapshot | null;
export type GetUserRecipesResponse = UserRecipesResponse;
export type GetRecipeMarketplaceResponse = RecipeMarketplaceResponse;
export type GetCollaborativePacksResponse = CollaborativePacksResponse;
export type ExportCollaborativePackResponse = CollaborativePackExportResponse;
export type GetTeamSpacesResponse = TeamSpacesResponse;
export type ExportTeamSpaceResponse = TeamSpaceExportResponse;
export type GetRemoteSyncSettingsResponse = RemoteSyncSettingsResponse;
export type RunRemoteSyncResponse = RemoteSyncRunResponse;
export type GetSelectiveSyncConfigResponse = SelectiveSyncConfigResponse;

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
  | RecordDiagnosticResponse
  | PreviewStyleSourceResponse
  | SetStyleSourceResponse
  | ReloadStyleSourceResponse
  | RollbackStyleSourceResponse
  | GetStyleSourceStatusesResponse
  | GetStyleVersionResponse
  | GetUserRecipesResponse
  | GetRecipeMarketplaceResponse
  | GetCollaborativePacksResponse
  | ExportCollaborativePackResponse
  | GetTeamSpacesResponse
  | ExportTeamSpaceResponse
  | GetRemoteSyncSettingsResponse
  | RunRemoteSyncResponse
  | GetSelectiveSyncConfigResponse;

export default BackgroundPageMessageResponse;
