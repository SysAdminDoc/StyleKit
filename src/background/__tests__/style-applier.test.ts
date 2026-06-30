const createChromeMock = () => ({
  scripting: {
    insertCSS: vi.fn(async () => undefined),
    removeCSS: vi.fn(async () => undefined),
  },
});

describe('USER-origin style applier', () => {
  const importApplier = async (withScripting = true) => {
    vi.resetModules();
    vi.stubGlobal(
      'chrome',
      withScripting ? createChromeMock() : { scripting: undefined }
    );

    const module = await import('../style-applier');
    module.resetUserOriginCssForTests();
    return module;
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('inserts raw CSS at USER origin without adding important declarations', async () => {
    const { applyUserOriginStylesToFrame } = await importApplier();

    await expect(
      applyUserOriginStylesToFrame(10, 0, [
        {
          url: 'example.com',
          css: 'body { color: red; }',
          enabled: true,
          readability: false,
          modifiedTime: '2026-06-30T10:00:00.000-04:00',
        },
      ])
    ).resolves.toBe(true);

    expect(chrome.scripting.insertCSS).toHaveBeenCalledWith({
      target: {
        tabId: 10,
        frameIds: [0],
      },
      css: 'body { color: red; }',
      origin: 'USER',
    });
  });

  it('removes old USER-origin CSS before replacing a style', async () => {
    const { applyUserOriginCss } = await importApplier();

    await applyUserOriginCss({ tabId: 10, frameId: 0 }, 'example.com', 'a{}');
    await applyUserOriginCss({ tabId: 10, frameId: 0 }, 'example.com', 'b{}');

    expect(chrome.scripting.removeCSS).toHaveBeenCalledWith({
      target: {
        tabId: 10,
        frameIds: [0],
      },
      css: 'a{}',
      origin: 'USER',
    });
    expect(chrome.scripting.insertCSS).toHaveBeenLastCalledWith({
      target: {
        tabId: 10,
        frameIds: [0],
      },
      css: 'b{}',
      origin: 'USER',
    });
  });

  it('removes stale USER-origin CSS when a style no longer matches the frame', async () => {
    const { applyUserOriginStylesToFrame } = await importApplier();

    await applyUserOriginStylesToFrame(10, 0, [
      {
        url: 'old.example.com',
        css: 'body { color: red; }',
        enabled: true,
        readability: false,
        modifiedTime: '2026-06-30T10:00:00.000-04:00',
      },
    ]);

    await expect(
      applyUserOriginStylesToFrame(10, 0, [
        {
          url: 'new.example.com',
          css: 'body { color: blue; }',
          enabled: true,
          readability: false,
          modifiedTime: '2026-06-30T10:01:00.000-04:00',
        },
      ])
    ).resolves.toBe(true);

    expect(chrome.scripting.removeCSS).toHaveBeenCalledWith({
      target: {
        tabId: 10,
        frameIds: [0],
      },
      css: 'body { color: red; }',
      origin: 'USER',
    });
    expect(chrome.scripting.insertCSS).toHaveBeenLastCalledWith({
      target: {
        tabId: 10,
        frameIds: [0],
      },
      css: 'body { color: blue; }',
      origin: 'USER',
    });
  });

  it('returns false when scripting CSS is unavailable', async () => {
    const { applyUserOriginCss } = await importApplier(false);

    await expect(
      applyUserOriginCss({ tabId: 10, frameId: 0 }, 'example.com', 'a{}')
    ).resolves.toBe(false);
  });
});
