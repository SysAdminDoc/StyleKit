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
export const initSpaNavigationListener = (
  onNavigate: () => void
): void => {
  if (window.stylebotReaderSpaListenerInit) {
    return;
  }
  window.stylebotReaderSpaListenerInit = true;

  // Intercept History API calls
  const originalPushState = history.pushState.bind(history);
  const originalReplaceState = history.replaceState.bind(history);

  history.pushState = function (...args) {
    originalPushState(...args);
    onNavigate();
  };

  history.replaceState = function (...args) {
    originalReplaceState(...args);
    onNavigate();
  };

  window.addEventListener('popstate', () => {
    onNavigate();
  });
};
