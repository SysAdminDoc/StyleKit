import type { StyleMap } from '@stylekit/types';

const createChromeMock = () => ({
  storage: {
    onChanged: {
      addListener: vi.fn(),
    },
  },
});

const makeStyles = (): StyleMap => ({
  'example.com': {
    css: 'body { color: red; }',
    enabled: true,
    readability: false,
    modifiedTime: '2026-06-30T12:00:00.000-04:00',
  },
  'child.example.com': {
    css: 'body { color: blue; }',
    enabled: true,
    readability: false,
    modifiedTime: '2026-06-30T12:01:00.000-04:00',
  },
});

describe('frame-aware style matching', () => {
  const importStylesModule = async () => {
    vi.resetModules();
    vi.stubGlobal('chrome', createChromeMock());

    return import('../styles');
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('matches top-frame styles against the top document URL', async () => {
    const { getStylesForPage } = await importStylesModule();
    const result = getStylesForPage('https://example.com/page', makeStyles());

    expect(result.styles.map(style => style.url)).toEqual(['example.com']);
    expect(result.frameMatchSource).toBe('top-frame');
    expect(result.frameMatchUrl).toBe('https://example.com/page');
  });

  it('matches child frames against the child frame URL', async () => {
    const { getStylesForFrame } = await importStylesModule();
    const result = getStylesForFrame(
      'https://child.example.com/widget',
      'https://example.com/page',
      makeStyles()
    );

    expect(result.styles.map(style => style.url)).toEqual([
      'child.example.com',
      'example.com',
    ]);
    expect(result.frameMatchSource).toBe('frame-url');
    expect(result.frameMatchUrl).toBe('https://child.example.com/widget');
  });

  it('does not apply top-page styles to unrelated child frames', async () => {
    const { getStylesForFrame } = await importStylesModule();
    const result = getStylesForFrame(
      'https://ads.example.net/frame',
      'https://example.com/page',
      makeStyles()
    );

    expect(result.styles).toEqual([]);
    expect(result.frameMatchSource).toBe('frame-url');
    expect(result.frameMatchUrl).toBe('https://ads.example.net/frame');
  });

  it('matches about:blank frames against a valid parent referrer', async () => {
    const { getStylesForFrame } = await importStylesModule();
    const result = getStylesForFrame(
      'about:blank',
      'https://example.com/page',
      makeStyles()
    );

    expect(result.styles.map(style => style.url)).toEqual(['example.com']);
    expect(result.frameMatchSource).toBe('parent-url');
    expect(result.frameMatchUrl).toBe('https://example.com/page');
  });

  it('matches srcdoc frames against a valid parent referrer', async () => {
    const { getStylesForFrame } = await importStylesModule();
    const result = getStylesForFrame(
      'about:srcdoc',
      'https://example.com/page',
      makeStyles()
    );

    expect(result.styles.map(style => style.url)).toEqual(['example.com']);
    expect(result.frameMatchSource).toBe('parent-url');
    expect(result.frameMatchUrl).toBe('https://example.com/page');
  });

  it('blocks opaque frames that do not expose a matchable parent URL', async () => {
    const { getStylesForFrame } = await importStylesModule();
    const result = getStylesForFrame('about:blank', '', makeStyles());

    expect(result.styles).toEqual([]);
    expect(result.frameMatchSource).toBe('blocked');
    expect(result.frameBlockedReason).toBe(
      'opaque-frame-without-matchable-parent'
    );
  });
});
