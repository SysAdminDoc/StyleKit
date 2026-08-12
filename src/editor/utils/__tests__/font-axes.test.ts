import {
  buildVariationSettings,
  findFontAxes,
  getAxisStep,
  parseFontFamilies,
  parseVariationSettings,
} from '../font-axes';

describe('variable font axes', () => {
  const axes = {
    'Roboto Flex': [
      { tag: 'wght', min: 100, max: 1000, defaultValue: 400 },
      { tag: 'wdth', min: 25, max: 151, defaultValue: 100 },
    ],
  };

  it('matches the first variable family in a computed fallback stack', () => {
    expect(parseFontFamilies('"Roboto Flex", Arial, sans-serif')).toEqual([
      'Roboto Flex',
      'Arial',
      'sans-serif',
    ]);
    expect(findFontAxes('"Roboto Flex", Arial', axes)).toEqual({
      family: 'Roboto Flex',
      axes: axes['Roboto Flex'],
    });
  });

  it('parses and serializes variation settings safely and deterministically', () => {
    const settings = parseVariationSettings(
      '"wdth" 112.5, "opsz" 14, "invalid" 1, "slnt" -7'
    );
    expect(settings).toEqual({ wdth: 112.5, opsz: 14, slnt: -7 });
    expect(buildVariationSettings(settings)).toBe(
      '"opsz" 14, "slnt" -7, "wdth" 112.5'
    );
  });

  it('chooses useful slider precision from the supported range', () => {
    expect(getAxisStep({ tag: 'ital', min: 0, max: 1, defaultValue: 0 })).toBe(
      0.01
    );
    expect(
      getAxisStep({ tag: 'slnt', min: -10, max: 0, defaultValue: 0 })
    ).toBe(0.1);
    expect(getAxisStep(axes['Roboto Flex'][1])).toBe(1);
  });
});
