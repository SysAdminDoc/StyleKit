export const MONACO_THEME_STORAGE_KEY = 'stylekit-monaco-theme';

export const MONACO_THEMES = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
  { value: 'sepia', label: 'Sepia' },
] as const;

export type MonacoTheme = (typeof MONACO_THEMES)[number]['value'];

export const isMonacoTheme = (value: unknown): value is MonacoTheme =>
  MONACO_THEMES.some(theme => theme.value === value);

export const getMonacoThemeName = (theme: MonacoTheme): string =>
  `stylekit-${theme}`;
