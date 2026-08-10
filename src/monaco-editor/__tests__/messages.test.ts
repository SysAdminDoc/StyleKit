import {
  getExtensionMessageOrigin,
  isExpectedExtensionWindowMessage,
  isIframeMessage,
  isParentUpdateCssMessage,
} from '../messages';

const extensionOrigin = 'chrome-extension://abc123';

const makeMessageEvent = (
  origin: string,
  source: Window | null
): MessageEvent =>
  ({
    origin,
    source,
  }) as MessageEvent;

describe('monaco editor window messages', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      runtime: {
        getURL: vi.fn((path: string) => `${extensionOrigin}${path}`),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes the extension URL to a message origin', () => {
    expect(getExtensionMessageOrigin()).toBe(extensionOrigin);
  });

  it('accepts only known iframe message payloads', () => {
    expect(isIframeMessage({ type: 'stylebotMonacoIframeLoaded' })).toBe(true);
    expect(
      isIframeMessage({
        type: 'stylebotMonacoIframeCssUpdated',
        css: 'body { color: red; }',
      })
    ).toBe(true);

    expect(isIframeMessage({ type: 'stylebotMonacoIframeCssUpdated' })).toBe(
      false
    );
    expect(
      isIframeMessage({
        type: 'stylebotMonacoIframeCssUpdated',
        css: 1,
      })
    ).toBe(false);
    expect(isIframeMessage({ type: 'unknown' })).toBe(false);
    expect(isIframeMessage(null)).toBe(false);
  });

  it('accepts only known parent CSS update payloads', () => {
    expect(
      isParentUpdateCssMessage({
        type: 'stylebotCssUpdate',
        css: 'body { color: red; }',
      })
    ).toBe(true);
    expect(
      isParentUpdateCssMessage({
        type: 'stylebotCssUpdate',
        css: '',
        selector: '.example',
      })
    ).toBe(true);

    expect(isParentUpdateCssMessage({ type: 'stylebotCssUpdate' })).toBe(false);
    expect(
      isParentUpdateCssMessage({
        type: 'stylebotCssUpdate',
        css: 'body { color: red; }',
        selector: 1,
      })
    ).toBe(false);
    expect(isParentUpdateCssMessage({ type: 'unknown', css: '' })).toBe(false);
  });

  it('accepts messages only from the expected extension window source', () => {
    const expectedSource = {} as Window;
    const unexpectedSource = {} as Window;

    expect(
      isExpectedExtensionWindowMessage(
        makeMessageEvent(extensionOrigin, expectedSource),
        expectedSource
      )
    ).toBe(true);
    expect(
      isExpectedExtensionWindowMessage(
        makeMessageEvent('https://example.com', expectedSource),
        expectedSource
      )
    ).toBe(false);
    expect(
      isExpectedExtensionWindowMessage(
        makeMessageEvent(extensionOrigin, unexpectedSource),
        expectedSource
      )
    ).toBe(false);
    expect(
      isExpectedExtensionWindowMessage(
        makeMessageEvent(extensionOrigin, expectedSource),
        null
      )
    ).toBe(false);
  });
});
