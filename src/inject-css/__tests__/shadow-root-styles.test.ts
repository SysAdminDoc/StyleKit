// @vitest-environment jsdom

import { Style } from '@stylekit/types';
import {
  createShadowRootStyleManager,
  ShadowRootStyleManager,
} from '../shadow-root-styles';

const createStyle = (overrides: Partial<Style> = {}): Style => ({
  url: 'example.com',
  css: ':host, button { color: red; }',
  enabled: true,
  readability: false,
  shadowRoots: true,
  modifiedTime: '2026-08-12T08:00:00.000-04:00',
  ...overrides,
});

describe('open shadow-root style manager', () => {
  let manager: ShadowRootStyleManager;

  afterEach(() => {
    manager?.dispose();
    document.body.replaceChildren();
    vi.useRealTimers();
  });

  it('applies opted-in styles to existing and nested open roots', () => {
    const host = document.createElement('section');
    const root = host.attachShadow({ mode: 'open' });
    const nestedHost = document.createElement('article');
    const nestedRoot = nestedHost.attachShadow({ mode: 'open' });
    root.appendChild(nestedHost);
    document.body.appendChild(host);

    manager = createShadowRootStyleManager();
    manager.applyStyles([createStyle()]);

    expect(root.querySelector('style')?.textContent).toContain('color: red');
    expect(nestedRoot.querySelector('style')?.textContent).toContain(
      'color: red'
    );
  });

  it('watches hosts added after styles are activated', async () => {
    manager = createShadowRootStyleManager();
    manager.applyStyles([createStyle()]);

    const host = document.createElement('section');
    const root = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(root.querySelector('style')?.textContent).toContain('color: red');
  });

  it('rescans for roots attached to existing hosts', () => {
    vi.useFakeTimers();
    const host = document.createElement('section');
    document.body.appendChild(host);
    manager = createShadowRootStyleManager({ scanIntervalMs: 10 });
    manager.applyStyles([createStyle()]);

    const root = host.attachShadow({ mode: 'open' });
    vi.advanceTimersByTime(10);

    expect(root.querySelector('style')?.textContent).toContain('color: red');
  });

  it('updates and removes managed styles on change, disable, or delete', () => {
    const host = document.createElement('section');
    const root = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    manager = createShadowRootStyleManager();

    manager.applyStyles([createStyle()]);
    manager.applyStyles([createStyle({ css: 'button { color: blue; }' })]);
    expect(root.querySelectorAll('style')).toHaveLength(1);
    expect(root.querySelector('style')?.textContent).toContain('color: blue');

    manager.applyStyles([createStyle({ enabled: false })]);
    expect(root.querySelector('style')).toBeNull();

    manager.applyStyles([createStyle()]);
    manager.applyStyles([]);
    expect(root.querySelector('style')).toBeNull();
  });

  it('does not inject page styles into StyleKit own editor root', () => {
    const host = document.createElement('div');
    host.id = 'stylebot';
    const root = host.attachShadow({ mode: 'open' });
    document.body.appendChild(host);
    manager = createShadowRootStyleManager();

    manager.applyStyles([createStyle()]);

    expect(root.querySelector('style')).toBeNull();
  });
});
