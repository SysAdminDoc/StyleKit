import {
  getMonacoCssOptions,
  isMonacoLintPreset,
  MONACO_LINT_PRESETS,
  normalizeLintSite,
  parseMonacoLintSettings,
  resolveMonacoLintPreset,
} from '../lint-presets';

describe('Monaco CSS lint presets', () => {
  it('offers relaxed, Stylelint Standard, and strict profiles', () => {
    expect(MONACO_LINT_PRESETS.map(preset => preset.value)).toEqual([
      'relaxed',
      'standard',
      'strict',
    ]);
    expect(isMonacoLintPreset('standard')).toBe(true);
    expect(isMonacoLintPreset('custom')).toBe(false);
  });

  it('maps profiles to materially different Monaco diagnostics', () => {
    expect(getMonacoCssOptions('relaxed').lint.unknownProperties).toBe(
      'ignore'
    );
    expect(getMonacoCssOptions('standard').lint.unknownProperties).toBe(
      'warning'
    );
    expect(getMonacoCssOptions('strict').lint.unknownProperties).toBe('error');
    expect(getMonacoCssOptions('strict').lint.important).toBe('error');
  });

  it('validates and bounds persisted per-site overrides', () => {
    const settings = parseMonacoLintSettings({
      defaultPreset: 'standard',
      sitePresets: {
        'Example.COM': 'strict',
        __proto__: 'strict',
        'bad site': 'strict',
        'ignored.test': 'custom',
      },
    });
    expect(settings).toEqual({
      defaultPreset: 'standard',
      sitePresets: { 'example.com': 'strict' },
    });
    expect(normalizeLintSite('[::1]')).toBe('[::1]');
  });

  it('resolves a site override before the global default', () => {
    const settings = {
      defaultPreset: 'relaxed' as const,
      sitePresets: { 'example.com': 'strict' as const },
    };
    expect(resolveMonacoLintPreset(settings, 'example.com')).toBe('strict');
    expect(resolveMonacoLintPreset(settings, 'other.test')).toBe('relaxed');
  });
});
