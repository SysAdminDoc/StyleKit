import { getCurrentTimestamp } from '@stylekit/utils';
import { appendImportantToDeclarations, safeParse } from '@stylekit/css';

import {
  Style,
  StyleMap,
  StyleWithoutUrl,
  ApplyStylesToTab,
} from '@stylekit/types';

import BackgroundPageUtils from './utils';
import { getCachedStyles, setCachedStyles } from './cache';
import { StyleIndex } from './style-index';

export const updateIcon = (
  tab: chrome.tabs.Tab,
  styles: Array<Style>,
  defaultStyle?: Style
): void => {
  const enabledStyles = styles.filter(style => style.enabled);

  if (defaultStyle && defaultStyle.readability) {
    chrome.action.setBadgeText({
      text: `R`,
      tabId: tab.id,
    });
  } else if (enabledStyles.length > 0) {
    chrome.action.setBadgeText({
      text: `${enabledStyles.length}`,
      tabId: tab.id,
    });
  } else {
    chrome.action.setBadgeText({ text: '', tabId: tab.id });
  }
};

export const applyStylesToAllTabs = async (): Promise<void> => {
  const allStyles = await getAll();
  const tabs = await chrome.tabs.query({});

  tabs.forEach(tab => {
    if (tab && tab.url && tab.id) {
      const { styles, defaultStyle } = getStylesForPage(tab.url, allStyles);

      const message: ApplyStylesToTab = {
        name: 'ApplyStylesToTab',
        defaultStyle,
        styles,
      };

      chrome.tabs.sendMessage(tab.id, message).catch(e => console.warn('StyleKit: failed to send styles to tab', tab.id, e));

      if (tab.active) {
        updateIcon(tab, styles, defaultStyle);
      }
    }
  });
};

export const getAll = async (): Promise<StyleMap> => {
  return getCachedStyles();
};

export const get = async (url: string): Promise<StyleWithoutUrl> => {
  const styles = await getAll();
  return styles[url];
};

const styleIndex = new StyleIndex();
let indexBuiltForStyles: StyleMap | null = null;

const ensureIndex = (allStyles: StyleMap): void => {
  if (indexBuiltForStyles !== allStyles) {
    styleIndex.build(allStyles);
    indexBuiltForStyles = allStyles;
  }
};

export const getStylesForPage = (
  pageUrl: string,
  allStyles: StyleMap,
  important = false
): {
  styles: Array<Style>;
  defaultStyle?: Style;
} => {
  if (!pageUrl) {
    return { styles: [] };
  }

  if (!BackgroundPageUtils.isValidHTML(pageUrl)) {
    return { styles: [] };
  }

  ensureIndex(allStyles);
  const matchingUrls = styleIndex.getMatchingUrls(pageUrl);

  const styles = [];
  let defaultStyle: Style | undefined;

  for (const url of matchingUrls) {
    if (!allStyles[url]) continue;

    const rawCss = allStyles[url].css || '';
    const css = important
      ? appendImportantToDeclarations(rawCss)
      : rawCss;

    const { enabled, readability, modifiedTime } = allStyles[url];
    const style = { url, css, enabled, readability, modifiedTime };

    if (url !== '*') {
      if (!defaultStyle || url.length > defaultStyle.url.length) {
        defaultStyle = style;
      }
    }

    if (style.css) {
      styles.push(style);
    }
  }

  return { styles, defaultStyle };
};

export const setAll = async (styles: StyleMap): Promise<void> => {
  setCachedStyles(styles);
  indexBuiltForStyles = null;
  chrome.storage.local.set({
    styles,

    'styles-metadata': {
      modifiedTime: getCurrentTimestamp(),
    },
  });
};

export const set = async (
  url: string,
  css: string,
  readability: boolean
): Promise<void> => {
  const styles = await getAll();

  if (!css) {
    delete styles[url];
  } else {
    styles[url] = {
      css,
      readability,
      enabled: true,
      modifiedTime: getCurrentTimestamp(),
    };
  }

  return setAll(styles);
};

export const enable = async (url: string): Promise<void> => {
  const styles = await getAll();

  if (!styles[url]) {
    return;
  }

  styles[url].enabled = true;
  return setAll(styles);
};

export const disable = async (url: string): Promise<void> => {
  const styles = await getAll();

  if (!styles[url]) {
    return;
  }

  styles[url].enabled = false;
  return setAll(styles);
};

export const setReadability = async (
  url: string,
  value: boolean
): Promise<void> => {
  const styles = await getAll();

  if (styles[url]) {
    styles[url].readability = value;
  } else {
    styles[url] = {
      css: '',
      enabled: true,
      readability: value,
      modifiedTime: getCurrentTimestamp(),
    };
  }

  return setAll(styles);
};

export const move = async (src: string, dest: string): Promise<void> => {
  const styles = await getAll();

  if (styles[src]) {
    styles[dest] = JSON.parse(JSON.stringify(styles[src]));
    delete styles[src];

    return setAll(styles);
  }
};

export const getImportCss = (url: string): Promise<string> => {
  return new Promise(resolve => {
    // Only allow CSS imports from HTTPS URLs
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') { resolve(''); return; }
    } catch { resolve(''); return; }

    fetch(url)
      .then(response => {
        if (!response.ok) {
          resolve('');
          return;
        }
        return response.text();
      })
      .then(css => {
        if (!css) {
          resolve('');
          return;
        }
        safeParse(css);
        resolve(css);
      })
      .catch(() => {
        // if css is invalid, return back empty css
        resolve('');
      });
  });
};
