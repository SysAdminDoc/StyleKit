export const MONACO_LINT_STORAGE_KEY = 'stylekit-monaco-lint';

export const MONACO_LINT_PRESETS = [
  { value: 'relaxed', label: 'Relaxed' },
  { value: 'standard', label: 'Stylelint Standard' },
  { value: 'strict', label: 'Strict' },
] as const;

export type MonacoLintPreset = (typeof MONACO_LINT_PRESETS)[number]['value'];
type LintSeverity = 'ignore' | 'warning' | 'error';
type MonacoCssLintOptions = Record<string, LintSeverity>;

export type MonacoLintSettings = {
  defaultPreset: MonacoLintPreset;
  sitePresets: Record<string, MonacoLintPreset>;
};

export const DEFAULT_MONACO_LINT_SETTINGS: MonacoLintSettings = {
  defaultPreset: 'relaxed',
  sitePresets: {},
};

const relaxed: MonacoCssLintOptions = {
  argumentsInColorFunction: 'ignore',
  boxModel: 'ignore',
  compatibleVendorPrefixes: 'ignore',
  duplicateProperties: 'warning',
  emptyRules: 'warning',
  float: 'ignore',
  fontFaceProperties: 'ignore',
  hexColorLength: 'ignore',
  idSelector: 'ignore',
  ieHack: 'ignore',
  important: 'ignore',
  importStatement: 'ignore',
  propertyIgnoredDueToDisplay: 'ignore',
  universalSelector: 'ignore',
  unknownProperties: 'ignore',
  unknownVendorSpecificProperties: 'ignore',
  vendorPrefix: 'ignore',
  zeroUnits: 'ignore',
};

const standard: MonacoCssLintOptions = {
  ...relaxed,
  argumentsInColorFunction: 'warning',
  fontFaceProperties: 'warning',
  hexColorLength: 'warning',
  ieHack: 'warning',
  important: 'warning',
  unknownProperties: 'warning',
  unknownVendorSpecificProperties: 'warning',
  vendorPrefix: 'warning',
  zeroUnits: 'warning',
};

const strict: MonacoCssLintOptions = Object.fromEntries(
  Object.keys(relaxed).map(key => [key, 'error' as const])
);

export const MONACO_CSS_LINT_OPTIONS: Record<
  MonacoLintPreset,
  MonacoCssLintOptions
> = { relaxed, standard, strict };

export const isMonacoLintPreset = (value: unknown): value is MonacoLintPreset =>
  MONACO_LINT_PRESETS.some(preset => preset.value === value);

export const normalizeLintSite = (site: unknown): string | undefined => {
  if (typeof site !== 'string') return undefined;
  const normalized = site.trim().toLowerCase();
  if (
    !normalized ||
    normalized.length > 253 ||
    !/^[a-z0-9.:[\]-]+$/.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
};

export const parseMonacoLintSettings = (value: unknown): MonacoLintSettings => {
  if (!value || typeof value !== 'object') {
    return { defaultPreset: 'relaxed', sitePresets: {} };
  }
  const input = value as Partial<MonacoLintSettings>;
  const sitePresets: Record<string, MonacoLintPreset> = {};
  if (input.sitePresets && typeof input.sitePresets === 'object') {
    Object.entries(input.sitePresets)
      .slice(0, 500)
      .forEach(([site, preset]) => {
        const normalizedSite = normalizeLintSite(site);
        if (normalizedSite && isMonacoLintPreset(preset)) {
          sitePresets[normalizedSite] = preset;
        }
      });
  }
  return {
    defaultPreset: isMonacoLintPreset(input.defaultPreset)
      ? input.defaultPreset
      : 'relaxed',
    sitePresets,
  };
};

export const resolveMonacoLintPreset = (
  settings: MonacoLintSettings,
  site?: string
): MonacoLintPreset =>
  (site && settings.sitePresets[site]) || settings.defaultPreset;

export const getMonacoCssOptions = (preset: MonacoLintPreset) => ({
  validate: true,
  lint: { ...MONACO_CSS_LINT_OPTIONS[preset] },
});
