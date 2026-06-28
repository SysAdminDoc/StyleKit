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
};

export const getExtensionMessageOrigin = (): string =>
  chrome.runtime.getURL('/').slice(0, -1);

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
    (message.selector === undefined || typeof message.selector === 'string')
  );
};

export const isExpectedExtensionWindowMessage = (
  message: MessageEvent,
  expectedSource: Window | null | undefined
): boolean =>
  message.origin === getExtensionMessageOrigin() &&
  !!expectedSource &&
  message.source === expectedSource;
