import type { GoogleFontAxis } from '@stylekit/types';

export const parseFontFamilies = (value: string): string[] =>
  value
    .split(',')
    .map(family => family.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);

export const findFontAxes = (
  fontFamily: string,
  catalog: Record<string, GoogleFontAxis[]>
): { family: string; axes: GoogleFontAxis[] } | null => {
  for (const family of parseFontFamilies(fontFamily)) {
    if (catalog[family]?.length) {
      return { family, axes: catalog[family].map(axis => ({ ...axis })) };
    }
  }
  return null;
};

export const parseVariationSettings = (
  value: string
): Record<string, number> => {
  const settings: Record<string, number> = {};
  const pattern = /['"]([\x20-\x7e]{4})['"]\s+(-?(?:\d+\.?\d*|\.\d+))/g;
  for (const match of value.matchAll(pattern)) {
    const number = Number(match[2]);
    if (Number.isFinite(number)) settings[match[1]] = number;
  }
  return settings;
};

export const buildVariationSettings = (
  settings: Record<string, number>
): string =>
  Object.entries(settings)
    .filter(
      ([tag, value]) => /^[\x20-\x7e]{4}$/.test(tag) && Number.isFinite(value)
    )
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([tag, value]) => `"${tag}" ${value}`)
    .join(', ');

export const getAxisStep = (axis: GoogleFontAxis): number => {
  const range = axis.max - axis.min;
  if (range <= 2) return 0.01;
  if (range <= 20) return 0.1;
  return 1;
};
