export type IframeCssUpdatedMessage = {
  type: 'stylebotMonacoIframeCssUpdated';
  css: string;
};

export type IframeLoadedMessage = {
  type: 'stylebotMonacoIframeLoaded';
};

export type IframeMessage = IframeCssUpdatedMessage | IframeLoadedMessage;

export type ParentUpdateCssMessage = {
  type: 'stylebotCssUpdate';
  css: string;
  selector?: string;
  lintSite?: string;
};

export const getExtensionMessageOrigin = (): string =>
  chrome.runtime.getURL('/').slice(0, -1);

export const getParentMessageOrigin = (
  referrer = document.referrer,
  ancestorOrigin = window.location.ancestorOrigins?.[0]
): string => {
  try {
    return new URL(ancestorOrigin || referrer).origin;
  } catch {
    return getExtensionMessageOrigin();
  }
};

export const isIframeMessage = (data: unknown): data is IframeMessage => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const message = data as Partial<IframeMessage>;

  if (message.type === 'stylebotMonacoIframeLoaded') {
    return true;
  }

  return (
    message.type === 'stylebotMonacoIframeCssUpdated' &&
    typeof (message as Partial<IframeCssUpdatedMessage>).css === 'string'
  );
};

export const isParentUpdateCssMessage = (
  data: unknown
): data is ParentUpdateCssMessage => {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const message = data as Partial<ParentUpdateCssMessage>;

  return (
    message.type === 'stylebotCssUpdate' &&
    typeof message.css === 'string' &&
    (message.selector === undefined || typeof message.selector === 'string') &&
    (message.lintSite === undefined || typeof message.lintSite === 'string')
  );
};

export const isExpectedExtensionWindowMessage = (
  message: MessageEvent,
  expectedSource: Window | null | undefined
): boolean =>
  message.origin === getExtensionMessageOrigin() &&
  !!expectedSource &&
  message.source === expectedSource;

export const isExpectedParentWindowMessage = (
  message: MessageEvent,
  expectedSource: Window | null | undefined,
  expectedOrigin = getParentMessageOrigin()
): boolean =>
  message.origin === expectedOrigin &&
  !!expectedSource &&
  message.source === expectedSource;
