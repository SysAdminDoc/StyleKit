// @vitest-environment jsdom

import Highlighter from '../Highlighter';

describe('multi-selector inspection', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="first">First</button>
      <button id="second">Second</button>
      <button id="third">Third</button>
    `;
    if (!globalThis.CSS) {
      Object.defineProperty(globalThis, 'CSS', { value: {} });
    }
    if (!CSS.escape) CSS.escape = (value: string) => value;
  });

  it('keeps additive selections active and removes duplicate selectors', () => {
    const onSelect = vi.fn();
    const highlighter = new Highlighter({ onSelect });
    highlighter.startInspecting('#first');

    document
      .querySelector('#second')
      ?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, shiftKey: true })
      );
    document
      .querySelector('#second')
      ?.dispatchEvent(
        new MouseEvent('click', { bubbles: true, shiftKey: true })
      );
    document
      .querySelector('#third')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onSelect).toHaveBeenNthCalledWith(1, '#first, #second', true);
    expect(onSelect).toHaveBeenNthCalledWith(2, '#first, #second', true);
    expect(onSelect).toHaveBeenNthCalledWith(3, '#third', false);
    highlighter.stopInspecting();
  });
});
