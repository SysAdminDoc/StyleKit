import * as postcss from 'postcss';

/**
 * Safely parse CSS with PostCSS, returning an empty root on failure.
 * Guards against undefined, null, non-string, or invalid CSS input.
 */
export const safeParse = (css: unknown): postcss.Root => {
  if (typeof css !== 'string' || !css.trim()) {
    return postcss.parse('');
  }

  try {
    return postcss.parse(css);
  } catch (e) {
    return postcss.parse('');
  }
};
