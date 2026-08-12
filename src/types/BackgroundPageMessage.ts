import {
  StylebotOptions,
  StylebotCommands,
  GoogleFontsCache,
  ReadabilitySettings,
  StyleMap,
  StylesRollbackReason,
  DiagnosticCategory,
  StyleSourceConfig,
  UserRecipe,
  UserRecipeDraft,
  RecipeMarketplaceSourceDraft,
  CollaborativePackUpdateEnvelope,
  TeamSpaceMutation,
  TeamSpaceUpdateEnvelope,
} from '@stylekit/types';

export type SetStyle = {
  name: 'SetStyle';
  url: string;
  css: string;
  readability: boolean;
  shadowRoots?: boolean;
};

export type GetStyleVersion = {
  name: 'GetStyleVersion';
  url: string;
};

export type GetUserRecipes = {
  name: 'GetUserRecipes';
};

export type SaveUserRecipe = {
  name: 'SaveUserRecipe';
  recipe: UserRecipeDraft;
};

export type DeleteUserRecipe = {
  name: 'DeleteUserRecipe';
  id: string;
};

export type ImportUserRecipes = {
  name: 'ImportUserRecipes';
  recipes: UserRecipe[];
};

export type GetRecipeMarketplace = {
  name: 'GetRecipeMarketplace';
};

export type AddRecipeMarketplaceSource = {
  name: 'AddRecipeMarketplaceSource';
  source: RecipeMarketplaceSourceDraft;
};

export type RefreshRecipeMarketplaceSource = {
  name: 'RefreshRecipeMarketplaceSource';
  id: string;
};

export type DeleteRecipeMarketplaceSource = {
  name: 'DeleteRecipeMarketplaceSource';
  id: string;
};

export type GetCollaborativePacks = {
  name: 'GetCollaborativePacks';
};

export type CreateCollaborativePack = {
  name: 'CreateCollaborativePack';
  packName: string;
};

export type CaptureCollaborativePack = {
  name: 'CaptureCollaborativePack';
  id: string;
};

export type ExportCollaborativePack = {
  name: 'ExportCollaborativePack';
  id: string;
};

export type ImportCollaborativePack = {
  name: 'ImportCollaborativePack';
  envelope: CollaborativePackUpdateEnvelope;
};

export type ApplyCollaborativePack = {
  name: 'ApplyCollaborativePack';
  id: string;
};

export type DeleteCollaborativePack = {
  name: 'DeleteCollaborativePack';
  id: string;
};

export type GetTeamSpaces = {
  name: 'GetTeamSpaces';
};

export type CreateTeamSpace = {
  name: 'CreateTeamSpace';
  spaceName: string;
  ownerName: string;
};

export type MutateTeamSpace = {
  name: 'MutateTeamSpace';
  id: string;
  mutation: TeamSpaceMutation;
};

export type ExportTeamSpace = {
  name: 'ExportTeamSpace';
  id: string;
  recipientId?: string;
};

export type ImportTeamSpace = {
  name: 'ImportTeamSpace';
  envelope: TeamSpaceUpdateEnvelope;
};

export type SetStyleShadowRoots = {
  name: 'SetStyleShadowRoots';
  url: string;
  enabled: boolean;
};

export type PreviewStyleSource = {
  name: 'PreviewStyleSource';
  sourceUrl: string;
};

export type SetStyleSource = {
  name: 'SetStyleSource';
  url: string;
  source: StyleSourceConfig | null;
};

export type ReloadStyleSource = {
  name: 'ReloadStyleSource';
  url: string;
};

export type RollbackStyleSource = {
  name: 'RollbackStyleSource';
  url: string;
};

export type GetStyleSourceStatuses = {
  name: 'GetStyleSourceStatuses';
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
  | GetStyleVersion
  | GetUserRecipes
  | SaveUserRecipe
  | DeleteUserRecipe
  | ImportUserRecipes
  | GetRecipeMarketplace
  | AddRecipeMarketplaceSource
  | RefreshRecipeMarketplaceSource
  | DeleteRecipeMarketplaceSource
  | GetCollaborativePacks
  | CreateCollaborativePack
  | CaptureCollaborativePack
  | ExportCollaborativePack
  | ImportCollaborativePack
  | ApplyCollaborativePack
  | DeleteCollaborativePack
  | GetTeamSpaces
  | CreateTeamSpace
  | MutateTeamSpace
  | ExportTeamSpace
  | ImportTeamSpace
  | SetStyleShadowRoots
  | PreviewStyleSource
  | SetStyleSource
  | ReloadStyleSource
  | RollbackStyleSource
  | GetStyleSourceStatuses
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
