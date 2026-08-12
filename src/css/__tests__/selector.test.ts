// @vitest-environment jsdom

import { appendSelector, getSelector, splitSelectorList } from '../selector';

describe('selector generation', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    if (!globalThis.CSS) {
      Object.defineProperty(globalThis, 'CSS', { value: {} });
    }
    if (!CSS.escape) {
      CSS.escape = (value: string) =>
        value.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    }
  });

  it('prefers a stable ID over an element class list', () => {
    document.body.innerHTML =
      '<button id="save" class="btn primary">Save</button>';
    expect(getSelector(document.querySelector('button') as HTMLElement)).toBe(
      '#save'
    );
  });

  it('uses the shortest unique class selector', () => {
    document.body.innerHTML = `
      <button class="btn primary tracked">Save</button>
      <button class="btn primary">Cancel</button>
    `;
    expect(getSelector(document.querySelector('button') as HTMLElement)).toBe(
      '.tracked'
    );
  });

  it('combines only enough shared classes to identify the element', () => {
    document.body.innerHTML = `
      <div class="alpha beta"></div>
      <div class="alpha gamma"></div>
      <div class="beta gamma"></div>
    `;
    expect(getSelector(document.querySelector('div') as HTMLElement)).toBe(
      '.alpha.beta'
    );
  });

  it('splits top-level selector lists without breaking functional selectors', () => {
    expect(splitSelectorList(':is(.a, .b), [data-label="a,b"], .c')).toEqual([
      ':is(.a, .b)',
      '[data-label="a,b"]',
      '.c',
    ]);
    expect(appendSelector('.a, .b', '.b, :is(.c, .d)')).toBe(
      '.a, .b, :is(.c, .d)'
    );
  });
});
