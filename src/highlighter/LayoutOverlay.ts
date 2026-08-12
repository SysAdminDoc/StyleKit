export type LayoutMode = 'grid' | 'flex';

export type LayoutContext = {
  container: HTMLElement;
  selectedElements: HTMLElement[];
  mode: LayoutMode;
  relation: 'container' | 'parent';
  items: HTMLElement[];
  columnGap: string;
  rowGap: string;
  flexDirection: string;
};

const getLayoutMode = (element: HTMLElement): LayoutMode | null => {
  const display = window.getComputedStyle(element).display;
  if (display === 'grid' || display === 'inline-grid') return 'grid';
  if (display === 'flex' || display === 'inline-flex') return 'flex';
  return null;
};

export const getLayoutContext = (selector: string): LayoutContext | null => {
  if (!selector.trim()) return null;
  let selectedElements: HTMLElement[];
  try {
    selectedElements = [...document.querySelectorAll<HTMLElement>(selector)];
  } catch {
    return null;
  }
  const selected = selectedElements[0];
  if (!selected) return null;

  const selectedMode = getLayoutMode(selected);
  const container = selectedMode ? selected : selected.parentElement;
  if (!container) return null;
  const mode = selectedMode || getLayoutMode(container);
  if (!mode) return null;

  const style = window.getComputedStyle(container);
  const inlineGap = container.style.gap.trim().split(/\s+/);
  return {
    container,
    selectedElements: selectedElements.filter(
      element => element === container || element.parentElement === container
    ),
    mode,
    relation: selectedMode ? 'container' : 'parent',
    items: [...container.children].filter(
      (element): element is HTMLElement => element instanceof HTMLElement
    ),
    columnGap:
      container.style.columnGap ||
      inlineGap[1] ||
      inlineGap[0] ||
      style.columnGap ||
      '0px',
    rowGap: container.style.rowGap || inlineGap[0] || style.rowGap || '0px',
    flexDirection: style.flexDirection || 'row',
  };
};

const assignStyles = (
  element: HTMLElement,
  styles: Partial<CSSStyleDeclaration>
): void => {
  Object.assign(element.style, styles);
};

const createOverlayNode = (
  className: string,
  styles: Partial<CSSStyleDeclaration>
): HTMLElement => {
  const element = document.createElement('div');
  element.className = className;
  assignStyles(element, {
    boxSizing: 'border-box',
    pointerEvents: 'none',
    position: 'fixed',
    ...styles,
  });
  return element;
};

const uniquePositions = (positions: number[]): number[] => [
  ...new Set(positions.map(position => Math.round(position))),
];

export default class LayoutOverlay {
  root: HTMLElement | null = null;
  selector = '';

  show = (selector: string): LayoutContext | null => {
    this.selector = selector;
    if (!this.root) {
      this.root = document.createElement('div');
      this.root.dataset.stylekitLayoutOverlay = '';
      this.root.setAttribute('aria-hidden', 'true');
      assignStyles(this.root, {
        pointerEvents: 'none',
        position: 'fixed',
        zIndex: '9999999',
      });
      document.body.appendChild(this.root);
      window.addEventListener('resize', this.refresh);
      window.addEventListener('scroll', this.refresh, true);
    }
    return this.render();
  };

  refresh = (): void => {
    this.render();
  };

  hide = (): void => {
    window.removeEventListener('resize', this.refresh);
    window.removeEventListener('scroll', this.refresh, true);
    this.root?.remove();
    this.root = null;
    this.selector = '';
  };

  private render(): LayoutContext | null {
    if (!this.root) return null;
    this.root.replaceChildren();
    const context = getLayoutContext(this.selector);
    if (!context) return null;

    const containerRect = context.container.getBoundingClientRect();
    const boundary = createOverlayNode('stylekit-layout-boundary', {
      top: `${containerRect.top}px`,
      left: `${containerRect.left}px`,
      width: `${containerRect.width}px`,
      height: `${containerRect.height}px`,
      border: `2px dashed ${context.mode === 'grid' ? '#89b4fa' : '#a6e3a1'}`,
      backgroundColor:
        context.mode === 'grid'
          ? 'rgba(137, 180, 250, 0.08)'
          : 'rgba(166, 227, 161, 0.08)',
    });
    this.root.appendChild(boundary);

    const label = createOverlayNode('stylekit-layout-label', {
      top: `${Math.max(2, containerRect.top - 24)}px`,
      left: `${Math.max(2, containerRect.left)}px`,
      padding: '3px 7px',
      color: '#1e1e2e',
      backgroundColor: context.mode === 'grid' ? '#89b4fa' : '#a6e3a1',
      borderRadius: '4px',
      fontFamily:
        'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: '11px',
      fontWeight: '700',
      whiteSpace: 'nowrap',
    });
    label.textContent = `${context.mode} · ${context.items.length} items · gap ${context.rowGap} ${context.columnGap}`;
    this.root.appendChild(label);

    const itemRects = context.items.map(item => item.getBoundingClientRect());
    context.items.forEach((item, index) => {
      const rect = itemRects[index];
      const isSelected = context.selectedElements.includes(item);
      const itemOverlay = createOverlayNode('stylekit-layout-item', {
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        border: `1px solid ${isSelected ? '#cba6f7' : '#f9e2af'}`,
        backgroundColor: isSelected
          ? 'rgba(203, 166, 247, 0.22)'
          : 'rgba(249, 226, 175, 0.14)',
      });
      itemOverlay.dataset.layoutItem = `${index + 1}`;
      this.root?.appendChild(itemOverlay);
    });

    if (context.mode === 'grid') {
      this.renderGridGuides(containerRect, itemRects);
    } else {
      this.renderFlexAxis(containerRect, context.flexDirection);
    }
    return context;
  }

  private renderGridGuides(containerRect: DOMRect, itemRects: DOMRect[]): void {
    const vertical = uniquePositions(
      itemRects.flatMap(rect => [rect.left, rect.right])
    );
    const horizontal = uniquePositions(
      itemRects.flatMap(rect => [rect.top, rect.bottom])
    );
    vertical.forEach(left => {
      this.root?.appendChild(
        createOverlayNode('stylekit-layout-guide', {
          top: `${containerRect.top}px`,
          left: `${left}px`,
          width: '1px',
          height: `${containerRect.height}px`,
          backgroundColor: 'rgba(137, 180, 250, 0.75)',
        })
      );
    });
    horizontal.forEach(top => {
      this.root?.appendChild(
        createOverlayNode('stylekit-layout-guide', {
          top: `${top}px`,
          left: `${containerRect.left}px`,
          width: `${containerRect.width}px`,
          height: '1px',
          backgroundColor: 'rgba(137, 180, 250, 0.75)',
        })
      );
    });
  }

  private renderFlexAxis(containerRect: DOMRect, direction: string): void {
    const vertical = direction.startsWith('column');
    this.root?.appendChild(
      createOverlayNode('stylekit-layout-axis', {
        top: `${
          vertical
            ? containerRect.top
            : containerRect.top + containerRect.height / 2
        }px`,
        left: `${
          vertical
            ? containerRect.left + containerRect.width / 2
            : containerRect.left
        }px`,
        width: vertical ? '2px' : `${containerRect.width}px`,
        height: vertical ? `${containerRect.height}px` : '2px',
        backgroundColor: 'rgba(166, 227, 161, 0.8)',
      })
    );
  }
}
