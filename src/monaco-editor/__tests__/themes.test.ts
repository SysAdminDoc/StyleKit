import {
  getMonacoThemeName,
  isMonacoTheme,
  MONACO_THEMES,
  MONACO_THEME_STORAGE_KEY,
} from '../themes';

describe('Monaco themes', () => {
  it('offers the three StyleKit UI themes in a stable order', () => {
    expect(MONACO_THEMES).toEqual([
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
      { value: 'sepia', label: 'Sepia' },
    ]);
  });

  it('validates persisted values before deriving the Monaco theme name', () => {
    expect(isMonacoTheme('light')).toBe(true);
    expect(isMonacoTheme('sepia')).toBe(true);
    expect(isMonacoTheme('unknown')).toBe(false);
    expect(getMonacoThemeName('dark')).toBe('stylekit-dark');
    expect(MONACO_THEME_STORAGE_KEY).toBe('stylekit-monaco-theme');
  });
});
