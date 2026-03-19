import { StyleMap, StylebotOptions } from '@stylekit/types';
import { defaultOptions } from '@stylekit/settings';

let cachedStyles: StyleMap | null = null;
let cachedOptions: StylebotOptions | null = null;

export const getCachedStyles = async (): Promise<StyleMap> => {
  if (cachedStyles !== null) {
    return cachedStyles;
  }

  const items = await chrome.storage.local.get('styles');
  cachedStyles = items['styles'] || {};
  return cachedStyles as StyleMap;
};

export const setCachedStyles = (styles: StyleMap): void => {
  cachedStyles = styles;
};

export const getCachedOptions = async (): Promise<StylebotOptions> => {
  if (cachedOptions !== null) {
    return cachedOptions;
  }

  const items = await chrome.storage.local.get('options');
  cachedOptions = items['options'] || defaultOptions;
  return cachedOptions as StylebotOptions;
};

export const setCachedOptions = (options: StylebotOptions): void => {
  cachedOptions = options;
};

export const invalidateCache = (key: string): void => {
  if (key === 'styles') {
    cachedStyles = null;
  } else if (key === 'options') {
    cachedOptions = null;
  }
};

// Invalidate cache when storage changes (e.g. from sync or options page)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local') {
    for (const key of Object.keys(changes)) {
      invalidateCache(key);
    }
  }
});
