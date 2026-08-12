// format: yyyy-MM-dd'T'HH:mm:ss.SSSxxx
export type Timestamp = string;

export type StylebotEditingMode = 'basic' | 'magic' | 'code';

export type StylebotBasicModeSections = {
  text: boolean;
  colors: boolean;
  layout: boolean;
  border: boolean;
  animations: boolean;
  variables: boolean;
  computedStyles: boolean;
  snippets: boolean;
  mediaQueries: boolean;
};

export type StylebotLayout = {
  width: number;
  adjustPageLayout: boolean;
  dockLocation: 'left' | 'right';
};

export type StylebotColorPalette = 'basic' | 'material';
export type StylebotFonts = Array<string>;
export type GoogleFontAxis = {
  tag: string;
  min: number;
  max: number;
  defaultValue: number;
};
export type GoogleFontsCache = {
  fonts: string[];
  axes?: Record<string, GoogleFontAxis[]>;
  ts: number;
};

export type StyleSourceIntervalMinutes = 1 | 5 | 15 | 60;

export type StyleSourceConfig = {
  url: string;
  enabled: boolean;
  intervalMinutes: StyleSourceIntervalMinutes;
};

export type StyleSourceStatus = {
  state: 'never' | 'synced' | 'updated' | 'rolled-back' | 'error';
  lastCheckedAt?: Timestamp;
  lastUpdatedAt?: Timestamp;
  lastError?: string;
  rollbackAvailable: boolean;
  snapshotCreatedAt?: Timestamp;
};

export type StyleSourceStatusMap = {
  [url: string]: StyleSourceStatus;
};

export type StyleSourcePreview = {
  css?: string;
  error?: string;
};

export type StylebotOptions = {
  contextMenu: boolean;
  fonts: StylebotFonts;
  layout: StylebotLayout;
  mode: StylebotEditingMode;
  basicModeSections: StylebotBasicModeSections;
  colorPalette: StylebotColorPalette;
  darkMode: boolean;
  showReadability: boolean;
  autoLoadStyles: boolean;
  minifyCssExport: boolean;
};

export type Style = {
  url: string;
  css: string;
  enabled: boolean;
  readability: boolean;
  shadowRoots?: boolean;
  source?: StyleSourceConfig;
  modifiedTime: Timestamp;
};

export type StyleWithoutUrl = Omit<Style, 'url'>;

export type StyleMap = {
  [url: string]: Omit<Style, 'url'>;
};

export type StyleVersionSnapshot = {
  css: string;
  savedAt: Timestamp;
};

export type UserRecipeDraft = {
  id?: string;
  name: string;
  description: string;
  sites: string[];
  css: string;
};

export type UserRecipe = Omit<UserRecipeDraft, 'id'> & {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type UserRecipeExportEnvelope = {
  version: 1;
  app: 'StyleKit';
  kind: 'recipes';
  exportedAt: Timestamp;
  recipes: UserRecipe[];
};

export type UserRecipesResponse = {
  recipes: UserRecipe[];
  error?: string;
};

export type RecipeMarketplaceSourceDraft = {
  repository: string;
  ref: string;
};

export type RecipeMarketplaceSource = RecipeMarketplaceSourceDraft & {
  id: string;
  fetchedAt: Timestamp;
  recipes: UserRecipe[];
};

export type RecipeMarketplaceResponse = {
  sources: RecipeMarketplaceSource[];
  error?: string;
};

export type StyleSyncTombstone = {
  deletedTime: Timestamp;
};

export type StyleSyncTombstoneMap = {
  [url: string]: StyleSyncTombstone;
};

export type StyleSyncConflict = {
  url: string;
  localModifiedTime: Timestamp;
  remoteModifiedTime: Timestamp;
  resolvedWith: 'local' | 'remote';
};

export type GoogleDriveSyncReport = {
  conflicts: StyleSyncConflict[];
  tombstonesApplied: number;
};

export type StylesRollbackReason =
  | 'json-import'
  | 'gist-import'
  | 'google-drive-sync';

export type StylesRollbackSnapshot = {
  id: Timestamp;
  createdAt: Timestamp;
  reason: StylesRollbackReason;
  styles: StyleMap;
};

// https://developer.mozilla.org/en-US/docs/Web/CSS/filter
export type FilterEffect =
  | 'blur'
  | 'brightness'
  | 'contrast'
  | 'drop-shadow'
  | 'grayscale'
  | 'hue-rotate'
  | 'invert'
  | 'opacity'
  | 'saturate'
  | 'sepia';

export type ReadabilityArticle = {
  title: string;
  byline: string;
  content: string;
  siteName: string;
};

export type ReadabilityTheme = 'light' | 'dark' | 'sepia';
export type ReadabilitySettings = {
  font: string;
  size: number;
  width: number;
  lineHeight: number;
  theme: ReadabilityTheme;
};

export type StylebotCommandName =
  | 'stylebot'
  | 'style'
  | 'readability'
  | 'grayscale';

export type StylebotCommands = {
  [key in StylebotCommandName]: string;
};

export type StylebotEditorCommandName =
  | 'inspect'
  | 'basic'
  | 'magic'
  | 'code'
  | 'help'
  | 'hide'
  | 'dockLeft'
  | 'dockRight'
  | 'resize'
  | 'pageLayout'
  | 'close';

export type StylebotEditorCommands = {
  [key in StylebotEditorCommandName]: string;
};

export type GoogleDriveSyncMetadata = {
  id: string;
  modifiedTime: string;
  webViewLink: string;
  webContentLink: string;
};

export type UserstylesIndexEntry = {
  i: number;
  n: string;
  c: string;
  u: number;
  t: number;
  w: number;
  r: number;
  an: string;
  sn: string;
  source: 'usw';
};

export type UserstylesProviderHealth = {
  provider: 'userstyles.world';
  status: 'ok' | 'degraded' | 'offline';
  checkedAt: number;
  lastSuccessAt?: number;
  failureCount: number;
  nextRetryAt?: number;
  lastOperation?: string;
  lastError?: string;
  usingCache: boolean;
};

export type GetUserstylesIndexResponse = {
  data: UserstylesIndexEntry[];
  health: UserstylesProviderHealth;
  fromCache: boolean;
  error?: string;
};

export type DiagnosticCategory =
  | 'sync'
  | 'import'
  | 'provider'
  | 'fonts'
  | 'message';

export type DiagnosticEvent = {
  id: string;
  timestamp: string;
  category: DiagnosticCategory;
  operation: string;
  level: 'warning' | 'error';
  message: string;
};

export type DiagnosticsBundle = {
  schemaVersion: 1;
  generatedAt: string;
  extension: {
    name: 'StyleKit';
    version: string;
  };
  browser: {
    name: string;
    userAgent: string;
    platform?: {
      os: string;
      arch: string;
      naclArch: string;
    };
  };
  permissions: {
    api: string[];
    origins: string[];
  };
  storage: {
    localBytes: number | null;
  };
  events: DiagnosticEvent[];
};

export * from './TabMessage';
export * from './BackgroundPageMessage';
export * from './BackgroundPageMessageResponse';

export { default as TabMessage } from './TabMessage';
export { default as BackgroundPageMessage } from './BackgroundPageMessage';
export { default as BackgroundPageMessageResponse } from './BackgroundPageMessageResponse';
