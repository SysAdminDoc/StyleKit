import {
  GOOGLE_FONTS_METADATA_URL,
  parseGoogleFontsMetadata,
} from '../google-fonts';

describe('Google Fonts metadata', () => {
  it('uses the live catalog host and retains valid variable axes', () => {
    const catalog = parseGoogleFontsMetadata(
      `)]}'
      {"familyMetadataList":[
        {"family":"Static Sans"},
        {"family":"Variable Sans","axes":[
          {"tag":"wght","min":100,"max":900,"defaultValue":400},
          {"tag":"wdth","min":75,"max":125,"defaultValue":100},
          {"tag":"bad","min":0,"max":1,"defaultValue":0}
        ]}
      ]}`,
      123
    );

    expect(GOOGLE_FONTS_METADATA_URL).toBe(
      'https://fonts.google.com/metadata/fonts'
    );
    expect(catalog.fonts).toEqual(['Static Sans', 'Variable Sans']);
    expect(catalog.axes?.['Variable Sans']).toEqual([
      { tag: 'wght', min: 100, max: 900, defaultValue: 400 },
      { tag: 'wdth', min: 75, max: 125, defaultValue: 100 },
    ]);
    expect(catalog.ts).toBe(123);
  });

  it('rejects malformed catalog payloads', () => {
    expect(() => parseGoogleFontsMetadata('{}')).toThrow('family list');
  });
});
