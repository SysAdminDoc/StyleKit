import { parse } from 'postcss';
import { safeParse } from './safe-parse';
import type { GoogleFontAxis } from '@stylekit/types';

const getGoogleFontUrlAndParams = (
  value: string,
  axes?: GoogleFontAxis[]
): { url: string; params: string } => {
  const arg = value.replace(/ /g, '+');
  const sortedAxes = axes
    ?.filter(axis => axis.min < axis.max)
    .sort((left, right) =>
      left.tag < right.tag ? -1 : left.tag > right.tag ? 1 : 0
    );
  const axisQuery = sortedAxes?.length
    ? `:${sortedAxes.map(axis => axis.tag).join(',')}@${sortedAxes
        .map(axis => `${axis.min}..${axis.max}`)
        .join(',')}`
    : ':ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900';
  const url = `https://fonts.googleapis.com/css2?family=${arg}${axisQuery}&display=swap`;
  const params = `url(${url})`;

  return { url, params };
};

/**
 * If font exists in https://developers.google.com/fonts, add relevant @import to the css.
 * Guards against duplicate @import and invalid fonts.
 */
export const addGoogleWebFont = async (
  value: string,
  css: string,
  axes?: GoogleFontAxis[]
): Promise<string> => {
  const root = safeParse(css);
  const { url, params } = getGoogleFontUrlAndParams(value, axes);

  return new Promise(resolve => {
    fetch(url)
      .then(response => {
        if (response.status === 400) {
          resolve(css);
          return;
        }

        let importExists = false;
        root.walkAtRules('import', atRule => {
          if (atRule.params === params) {
            importExists = true;
          }
        });

        if (!importExists) {
          const rule = parse(`@import ${params};`);
          root.prepend(rule);

          const next = root.first?.next();
          if (next) {
            next.raws.before = '\n\n';
          }
        }

        resolve(root.toString());
      })
      .catch(err => {
        console.error(err);
        resolve(css);
      });
  });
};

/**
 * Remove unused google web fonts from given css.
 */
export const cleanGoogleWebFonts = (css: string): string => {
  const root = safeParse(css);
  const fonts: Array<string> = [];

  root.walkDecls('font-family', decl => {
    const declFonts = decl.value.split(',');

    declFonts.forEach(value => {
      const trimmedValue = value.trim();

      if (trimmedValue && fonts.indexOf(trimmedValue) === -1) {
        fonts.push(trimmedValue);
      }
    });
  });

  root.walkAtRules('import', atRule => {
    const familyMatch = atRule.params.match(
      /fonts\.googleapis\.com\/css2\?family=([^:&)]+)(?::[^&)]+)?/
    );
    if (!familyMatch) return;
    const importedFamily = decodeURIComponent(
      familyMatch[1].replace(/\+/g, ' ')
    ).replace(/^['"]|['"]$/g, '');
    const used = fonts.some(
      font => font.replace(/^['"]|['"]$/g, '') === importedFamily
    );
    if (!used) {
      atRule.remove();
    }
  });

  return root.toString();
};
