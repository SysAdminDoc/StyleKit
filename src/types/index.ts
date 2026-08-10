// format: yyyy-MM-dd'T'HH:mm:ss.SSSxxx
export type Timestamp = string;

export type StylebotEditingMode = 'basic' | 'magic' | 'code';

export type StylebotBasicModeSections = {
  text: boolean;
  colors: boolean;
  layout: boolean;
  border: boolean;
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
export type GoogleFontsCache = {
  fonts: string[];
  ts: number;
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
};

export type Style = {
  url: string;
  css: string;
  enabled: boolean;
  readability: boolean;
  modifiedTime: Timestamp;
};

export type StyleWithoutUrl = Omit<Style, 'url'>;

export type StyleMap = {
  [url: string]: Omit<Style, 'url'>;
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

export * from './TabMessage';
export * from './BackgroundPageMessage';
export * from './BackgroundPageMessageResponse';

export { default as TabMessage } from './TabMessage';
export { default as BackgroundPageMessage } from './BackgroundPageMessage';
export { default as BackgroundPageMessageResponse } from './BackgroundPageMessageResponse';
