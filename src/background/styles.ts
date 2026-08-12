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
import { setAllStylesInStorage } from './style-storage';
import { applyUserOriginStylesToFrame } from './style-applier';
import { recordDiagnostic } from './diagnostics';

const LAST_STYLES_ROLLBACK_SNAPSHOT_KEY = 'styles-rollback-last';
const STYLE_TOMBSTONES_KEY = 'style-tombstones';
const OPAQUE_FRAME_URLS = new Set(['about:blank', 'about:srcdoc']);

const cloneStyles = (styles: StyleMap): StyleMap =>
  JSON.parse(JSON.stringify(styles));

const cloneTombstones = (
  tombstones: StyleSyncTombstoneMap
): StyleSyncTombstoneMap => JSON.parse(JSON.stringify(tombstones));

export const getStyleTombstones = async (): Promise<StyleSyncTombstoneMap> => {
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

  await Promise.all(
    tabs.map(async tab => {
      if (tab && tab.url && tab.id) {
        const { styles, defaultStyle } = getStylesForPage(tab.url, allStyles);
        const userOriginApplied = await applyUserOriginStylesToFrame(
          tab.id,
          0,
          styles
        );

        const message: ApplyStylesToTab = {
          name: 'ApplyStylesToTab',
          defaultStyle,
          styles,
          userOriginApplied,
        };

        chrome.tabs.sendMessage(tab.id, message).catch(error => {
          console.warn('StyleKit: failed to send styles to tab', tab.id, error);
          recordDiagnostic({
            category: 'message',
            operation: 'apply-styles-to-tab',
            error,
            level: 'warning',
          }).catch(() => undefined);
        });

        if (tab.active) {
          updateIcon(tab, styles, defaultStyle);
        }
      }
    })
  );
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
  frameMatchUrl?: string;
  frameMatchSource?: 'top-frame' | 'frame-url' | 'parent-url' | 'blocked';
  frameBlockedReason?: string;
} => {
  if (!pageUrl) {
    return {
      styles: [],
      frameMatchSource: 'blocked',
      frameBlockedReason: 'missing-url',
    };
  }

  if (!BackgroundPageUtils.isValidHTML(pageUrl)) {
    return {
      styles: [],
      frameMatchUrl: pageUrl,
      frameMatchSource: 'blocked',
      frameBlockedReason: 'non-html-url',
    };
  }

  ensureIndex(allStyles);
  const matchingUrls = styleIndex.getMatchingUrls(pageUrl);

  const styles = [];
  let defaultStyle: Style | undefined;

  for (const url of matchingUrls) {
    if (!allStyles[url]) continue;

    const rawCss = allStyles[url].css || '';
    const css = important ? appendImportantToDeclarations(rawCss) : rawCss;

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

  return {
    styles,
    defaultStyle,
    frameMatchUrl: pageUrl,
    frameMatchSource: 'top-frame',
  };
};

type StyleFrameMatch =
  | {
      url: string;
      source: 'frame-url' | 'parent-url';
    }
  | {
      source: 'blocked';
      reason: string;
      url?: string;
    };

const normalizeFrameUrl = (url: string): string =>
  url.trim().split(/[?#]/)[0].toLowerCase();

const isOpaqueFrameUrl = (url: string): boolean =>
  OPAQUE_FRAME_URLS.has(normalizeFrameUrl(url));

const isMatchableDocumentUrl = (url?: string): boolean => {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return (
      ['http:', 'https:', 'file:'].includes(parsed.protocol) &&
      BackgroundPageUtils.isValidHTML(url)
    );
  } catch {
    return false;
  }
};

export const resolveStyleFrameMatch = (
  frameUrl: string,
  parentUrl?: string
): StyleFrameMatch => {
  if (isMatchableDocumentUrl(frameUrl)) {
    return {
      url: frameUrl,
      source: 'frame-url',
    };
  }

  if (isOpaqueFrameUrl(frameUrl)) {
    if (isMatchableDocumentUrl(parentUrl)) {
      return {
        url: parentUrl as string,
        source: 'parent-url',
      };
    }

    return {
      source: 'blocked',
      reason: 'opaque-frame-without-matchable-parent',
      url: frameUrl,
    };
  }

  return {
    source: 'blocked',
    reason: 'unsupported-frame-url',
    url: frameUrl,
  };
};

export const getStylesForFrame = (
  frameUrl: string,
  parentUrl: string | undefined,
  allStyles: StyleMap,
  important = false
): {
  styles: Array<Style>;
  defaultStyle?: Style;
  frameMatchUrl?: string;
  frameMatchSource: 'frame-url' | 'parent-url' | 'blocked';
  frameBlockedReason?: string;
} => {
  const match = resolveStyleFrameMatch(frameUrl, parentUrl);

  if (match.source === 'blocked') {
    return {
      styles: [],
      frameMatchUrl: match.url,
      frameMatchSource: 'blocked',
      frameBlockedReason: match.reason,
    };
  }

  const result = getStylesForPage(match.url, allStyles, important);

  return {
    ...result,
    frameMatchUrl: match.url,
    frameMatchSource: match.source,
    frameBlockedReason: undefined,
  };
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
  await setAllStylesInStorage(styles);
  await chrome.storage.local.set({
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

export const getImportCss = async (url: string): Promise<string> => {
  try {
    // Only allow CSS imports from HTTPS URLs
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      throw new Error('CSS import URL must use HTTPS');
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`CSS import HTTP ${response.status}`);
    if (!isSafeCssContentType(response.headers.get('content-type'))) {
      throw new Error('CSS import content type is not supported');
    }

    const css = await response.text();
    if (!css) throw new Error('CSS import response was empty');
    safeParse(css);
    return css;
  } catch (error) {
    await recordDiagnostic({
      category: 'import',
      operation: 'import-rule-fetch',
      error,
    }).catch(() => undefined);
    return '';
  }
};
