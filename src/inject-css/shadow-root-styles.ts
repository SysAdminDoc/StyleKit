import { Style } from '@stylekit/types';

const SHADOW_STYLE_ATTRIBUTE = 'data-stylekit-shadow-style';
const DEFAULT_SCAN_INTERVAL_MS = 2000;

type ShadowRootStyleManagerOptions = {
  document?: Document;
  scanIntervalMs?: number;
};

export type ShadowRootStyleManager = {
  applyStyles(styles: readonly Style[]): void;
  dispose(): void;
};

const isStyleKitShadowRoot = (root: ShadowRoot): boolean =>
  root.host.id === 'stylebot';

export const createShadowRootStyleManager = (
  options: ShadowRootStyleManagerOptions = {}
): ShadowRootStyleManager => {
  const rootDocument = options.document || document;
  const scanIntervalMs = options.scanIntervalMs || DEFAULT_SCAN_INTERVAL_MS;
  const roots = new Set<ShadowRoot>();
  const styleElements = new Map<ShadowRoot, Map<string, HTMLStyleElement>>();
  let activeStyles = new Map<string, string>();
  let observer: MutationObserver | null = null;
  let scanTimer: number | null = null;

  const syncRoot = (root: ShadowRoot): void => {
    let elements = styleElements.get(root);
    if (!elements) {
      elements = new Map();
      styleElements.set(root, elements);
    }

    for (const [url, element] of elements) {
      if (!activeStyles.has(url)) {
        element.remove();
        elements.delete(url);
      }
    }

    for (const [url, css] of activeStyles) {
      let element = elements.get(url);
      if (!element) {
        element = rootDocument.createElement('style');
        element.setAttribute(SHADOW_STYLE_ATTRIBUTE, '');
        root.appendChild(element);
        elements.set(url, element);
      }
      if (element.textContent !== css) element.textContent = css;
    }
  };

  const registerRoot = (root: ShadowRoot): void => {
    if (isStyleKitShadowRoot(root)) return;
    if (!roots.has(root)) roots.add(root);
    observer?.observe(root, { childList: true, subtree: true });
    syncRoot(root);
  };

  const scan = (parent: ParentNode): void => {
    const inspectElement = (element: Element): void => {
      if (element.id === 'stylebot') return;
      if (element.shadowRoot) {
        registerRoot(element.shadowRoot);
        scan(element.shadowRoot);
      }
    };

    if (parent instanceof Element) inspectElement(parent);
    parent.querySelectorAll('*').forEach(inspectElement);
  };

  const removeAllStyles = (): void => {
    for (const elements of styleElements.values()) {
      elements.forEach(element => element.remove());
      elements.clear();
    }
    styleElements.clear();
    roots.clear();
  };

  const stopWatching = (): void => {
    observer?.disconnect();
    observer = null;
    if (scanTimer !== null) window.clearInterval(scanTimer);
    scanTimer = null;
  };

  const startWatching = (): void => {
    if (!observer) {
      observer = new MutationObserver(records => {
        records.forEach(record => {
          record.addedNodes.forEach(node => {
            if (node instanceof Element) scan(node);
          });
        });
      });
      observer.observe(rootDocument, { childList: true, subtree: true });
    }

    if (scanTimer === null) {
      scanTimer = window.setInterval(() => {
        for (const root of roots) {
          if (!root.host.isConnected) {
            styleElements.get(root)?.forEach(element => element.remove());
            styleElements.delete(root);
            roots.delete(root);
          }
        }
        scan(rootDocument);
      }, scanIntervalMs);
    }
  };

  return {
    applyStyles(styles: readonly Style[]): void {
      activeStyles = new Map(
        styles
          .filter(
            style => style.enabled && style.shadowRoots && style.css.trim()
          )
          .map(style => [style.url, style.css])
      );

      if (activeStyles.size === 0) {
        stopWatching();
        removeAllStyles();
        return;
      }

      startWatching();
      scan(rootDocument);
      roots.forEach(syncRoot);
    },

    dispose(): void {
      activeStyles.clear();
      stopWatching();
      removeAllStyles();
    },
  };
};

export const shadowRootStyleManager = createShadowRootStyleManager();
