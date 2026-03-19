import * as postcss from 'postcss';
import { safeParse } from './safe-parse';

import { GetImportCss, GetImportCssResponse } from '@stylekit/types';

// fetch and expand all imports for external CSS to get around CORS
export const getCssWithExpandedImports = (css: string): Promise<string> => {
  return new Promise(resolve => {
    const root = safeParse(css);
    const urls: Array<string> = [];

    root.walkAtRules('import', (atRule: postcss.AtRule) => {
      const params = atRule.params.trim();
      let url = '';

      // Match: url("..."), url('...'), url(...)
      const urlFuncMatch = params.match(/^url\(\s*["']?(.+?)["']?\s*\)$/);
      // Match: "..." or '...' (may contain parens in URL)
      const quotedMatch = params.match(/^["'](.+?)["']$/);

      if (urlFuncMatch) {
        url = urlFuncMatch[1].trim();
      } else if (quotedMatch) {
        url = quotedMatch[1].trim();
      }

      // Strip trailing ) that may be left over from malformed @import syntax
      url = url.replace(/\)+$/, '');

      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        urls.push(url);
        atRule.remove();
      }
    });

    const promises: Array<Promise<string>> = urls.map(url => {
      return new Promise(urlResolve => {
        const message: GetImportCss = {
          name: 'GetImportCss',
          url,
        };

        chrome.runtime.sendMessage(
          message,
          (response: GetImportCssResponse) => {
            urlResolve(response);
          }
        );
      });
    });

    let output = root.toString();
    Promise.all(promises)
      .then((values: Array<string>) => {
        const merged = values.filter(Boolean).join('\n\n');
        if (merged) {
          output = `${merged}\n\n${output}`;
        }
        resolve(output);
      })
      .catch(() => {
        resolve(output);
      });
  });
};
