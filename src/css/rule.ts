import * as postcss from 'postcss';
import { safeParse } from './safe-parse';

export const getRule = (css: string, selector: string): postcss.Rule | null => {
  const root = safeParse(css);
  const matchingRules: Array<postcss.Rule> = [];

  root.walkRules(selector, rule => { matchingRules.push(rule); });
  return matchingRules.length > 0 ? matchingRules[0] : null;
};

export const addEmptyRule = (css: string, selector: string): string => {
  const ruleCss = `${selector} {\n  \n}`;
  const cssWithNewLines = css.replace(/((.*)\})\n*$/, '$1\n\n');
  return `${cssWithNewLines}${ruleCss}`;
};

export const removeEmptyRules = (css: string): string => {
  const root = safeParse(css);
  root.walkRules(rule => {
    if (!rule.first) {
      rule.remove();
    }
  });
  return root.toString();
};
