// @vitest-environment jsdom

import LayoutOverlay, { getLayoutContext } from '../LayoutOverlay';

const rect = (
  left: number,
  top: number,
  width: number,
  height: number
): DOMRect =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;

describe('LayoutOverlay', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <section id="grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">
        <div id="one"></div><div id="two"></div>
      </section>
      <section id="flex" style="display: flex; gap: 8px">
        <div id="three"></div><div id="four"></div>
      </section>
    `;
  });

  it('detects a selected grid container', () => {
    const context = getLayoutContext('#grid');

    expect(context?.mode).toBe('grid');
    expect(context?.relation).toBe('container');
    expect(context?.items).toHaveLength(2);
    expect(context?.rowGap).toBe('12px');
  });

  it('uses a flex parent as the selected element context', () => {
    const context = getLayoutContext('#three, #four');

    expect(context?.mode).toBe('flex');
    expect(context?.relation).toBe('parent');
    expect(context?.selectedElements).toHaveLength(2);
    expect(getLayoutContext('[')).toBeNull();
  });

  it('draws transient item and track geometry and removes it cleanly', () => {
    const grid = document.querySelector('#grid') as HTMLElement;
    const one = document.querySelector('#one') as HTMLElement;
    const two = document.querySelector('#two') as HTMLElement;
    grid.getBoundingClientRect = () => rect(10, 20, 220, 100);
    one.getBoundingClientRect = () => rect(10, 20, 100, 100);
    two.getBoundingClientRect = () => rect(130, 20, 100, 100);
    const overlay = new LayoutOverlay();

    overlay.show('#one, #two');

    expect(
      document.querySelector('[data-stylekit-layout-overlay]')
    ).not.toBeNull();
    expect(document.querySelectorAll('.stylekit-layout-item')).toHaveLength(2);
    expect(
      document.querySelectorAll('.stylekit-layout-guide').length
    ).toBeGreaterThan(0);
    expect(
      document.querySelector('.stylekit-layout-label')?.textContent
    ).toContain('grid · 2 items');

    overlay.hide();
    expect(document.querySelector('[data-stylekit-layout-overlay]')).toBeNull();
  });
});
