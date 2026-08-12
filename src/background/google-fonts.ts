import type { GoogleFontAxis, GoogleFontsCache } from '@stylekit/types';

export const GOOGLE_FONTS_METADATA_URL =
  'https://fonts.google.com/metadata/fonts';

type GoogleFontsMetadata = {
  familyMetadataList?: Array<{
    family?: unknown;
    axes?: unknown;
  }>;
};

const isAxis = (value: unknown): value is GoogleFontAxis => {
  if (!value || typeof value !== 'object') return false;
  const axis = value as Record<string, unknown>;
  return (
    typeof axis.tag === 'string' &&
    /^[\x20-\x7e]{4}$/.test(axis.tag) &&
    typeof axis.min === 'number' &&
    Number.isFinite(axis.min) &&
    typeof axis.max === 'number' &&
    Number.isFinite(axis.max) &&
    typeof axis.defaultValue === 'number' &&
    Number.isFinite(axis.defaultValue) &&
    axis.min <= axis.defaultValue &&
    axis.defaultValue <= axis.max
  );
};

export const parseGoogleFontsMetadata = (
  text: string,
  timestamp = Date.now()
): GoogleFontsCache => {
  const metadata = JSON.parse(
    text.replace(/^\)\]\}'?\s*/, '')
  ) as GoogleFontsMetadata;
  if (!Array.isArray(metadata.familyMetadataList)) {
    throw new Error('Google Fonts metadata is missing its family list.');
  }

  const axes: Record<string, GoogleFontAxis[]> = {};
  const fonts = metadata.familyMetadataList
    .map(entry => {
      if (typeof entry.family !== 'string' || !entry.family.trim()) return '';
      const validAxes = Array.isArray(entry.axes)
        ? entry.axes.filter(isAxis).map(axis => ({ ...axis }))
        : [];
      if (validAxes.length > 0) axes[entry.family] = validAxes;
      return entry.family;
    })
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right));

  return { fonts, axes, ts: timestamp };
};
