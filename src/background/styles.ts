import { getCurrentTimestamp } from '@stylekit/utils';
import { appendImportantToDeclarations, safeParse } from '@stylekit/css';
import { isSafeCssContentType } from '../utils/style-import';

import {
  Style,
  StyleMap,
  StyleSyncTombstoneMap,
  StyleWithoutUrl,
  ApplyStylesToTab,
  StylesRollbackReason,
  StylesRollbackSnapshot,
} from '@stylekit/types';

import BackgroundPageUtils from './utils';
import { getCachedStyles, setCachedStyles } from './cache';
import { StyleIndex } from './style-index';

const LAST_STYLES_ROLLBACK_SNAPSHOT_KEY = 'styles-rollback-last';
const STYLE_TOMBSTONES_KEY = 'style-tombstones';

const cloneStyles = (styles: StyleMap): StyleMap =>
  JSON.parse(JSON.stringify(styles));

const cloneTombstones = (
  tombstones: StyleSyncTombstoneMap
): StyleSyncTombstoneMap => JSON.parse(JSON.stringify(tombstones));

export const getStyleTombstones =
  async (): Promise<StyleSyncTombstoneMap> => {
    const items = await chrome.storage.local.get(STYLE_TOMBSTONES_KEY);
    return items[STYLE_TOMBSTONES_KEY] || {};
  };

export const setStyleTombstones = async (
  tombstones: StyleSyncTombstoneMap
): Promise<void> => {
  await chrome.storage.local.set({
    [STYLE_TOMBSTONES_KEY]: cloneTombstones(tombstones),
  });
};

const recordDeletedStyleUrls = async (
  deletedUrls: string[],
  deletedTime = getCurrentTimestamp()
): Promise<void> => {
  if (deletedUrls.length === 0) return;

  const tombstones = await getStyleTombstones();

  deletedUrls.forEach(url => {
    tombstones[url] = { deletedTime };
  });

  await setStyleTombstones(tombstones);
};

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

export const createStylesRollbackSnapshot = async (
  reason: StylesRollbackReason,
  styles?: StyleMap
): Promise<StylesRollbackSnapshot> => {
  const currentStyles = styles || (await getAll());
  const timestamp = getCurrentTimestamp();
  const snapshot: StylesRollbackSnapshot = {
    id: timestamp,
    createdAt: timestamp,
    reason,
    styles: cloneStyles(currentStyles),
  };

  await chrome.storage.local.set({
    [LAST_STYLES_ROLLBACK_SNAPSHOT_KEY]: snapshot,
  });

  return snapshot;
};

export const getLastStylesRollbackSnapshot =
  async (): Promise<StylesRollbackSnapshot | null> => {
    const items = await chrome.storage.local.get(
      LAST_STYLES_ROLLBACK_SNAPSHOT_KEY
    );

    return items[LAST_STYLES_ROLLBACK_SNAPSHOT_KEY] || null;
  };

export const restoreLastStylesRollbackSnapshot =
  async (): Promise<StylesRollbackSnapshot | null> => {
    const snapshot = await getLastStylesRollbackSnapshot();

    if (!snapshot) {
      return null;
    }

    await setAll(cloneStyles(snapshot.styles));

    return snapshot;
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

export const setAll = async (
  styles: StyleMap,
  options: { recordTombstones?: boolean } = {}
): Promise<void> => {
  const shouldRecordTombstones = options.recordTombstones !== false;

  if (shouldRecordTombstones) {
    const currentStyles = await getAll();
    const deletedUrls = Object.keys(currentStyles).filter(url => !styles[url]);
    await recordDeletedStyleUrls(deletedUrls);
  }

  setCachedStyles(styles);
  indexBuiltForStyles = null;
  await chrome.storage.local.set({
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
    await recordDeletedStyleUrls([url]);
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
    await recordDeletedStyleUrls([src]);
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
        if (!isSafeCssContentType(response.headers.get('content-type'))) {
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
