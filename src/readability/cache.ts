declare global {
  interface Window {
    stylebotReaderUrl: string;
    stylebotReaderOriginalDocumentBodyElements: Array<Node>;
    stylebotReaderSpaListenerInit: boolean;
  }
}

export const cacheUrl = (): void => {
  window.stylebotReaderUrl = window.location.href;
};

export const didUrlChange = (): boolean => {
  return window.stylebotReaderUrl !== window.location.href;
};

export const cacheDocument = (): void => {
  const nodes = Array.prototype.slice
    .call(document.body.childNodes)
    .filter(node => node.id !== 'stylebot');

  window.stylebotReaderOriginalDocumentBodyElements = nodes;
  nodes.forEach(node => node.remove());
};

export const revertToCachedDocument = (): void => {
  if (window.stylebotReaderOriginalDocumentBodyElements) {
    window.stylebotReaderOriginalDocumentBodyElements.forEach(node => {
      document.body.appendChild(node);
    });
  }
};

/**
 * Listen for SPA navigation (pushState, replaceState, popstate)
 * and trigger a callback when the URL changes.
 */
/**
 * Listen for SPA navigation (pushState, replaceState, popstate)
 * and trigger a callback when the URL changes.
 * Only patches History API once; subsequent calls update the callback.
 */
let spaNavigateCallback: (() => void) | null = null;

export const initSpaNavigationListener = (
  onNavigate: () => void
): void => {
  spaNavigateCallback = onNavigate;

  if (window.stylebotReaderSpaListenerInit) {
    return;
  }
  window.stylebotReaderSpaListenerInit = true;

  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    originalPushState(...args);
    spaNavigateCallback?.();
  };

  history.replaceState = function (...args) {
    originalReplaceState(...args);
    spaNavigateCallback?.();
  };

  window.addEventListener('popstate', () => {
    spaNavigateCallback?.();
  });
};
