const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    element =>
      element.getAttribute('aria-hidden') !== 'true' &&
      !element.hasAttribute('hidden')
  );

const focusFirstElement = (container: HTMLElement): void => {
  (getFocusableElements(container)[0] || container).focus();
};

const trapFocus = (event: KeyboardEvent, container: HTMLElement): void => {
  if (event.key !== 'Tab') return;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) {
    event.preventDefault();
    container.focus();
    return;
  }

  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  const activeElement = container.ownerDocument.activeElement;

  if (
    event.shiftKey &&
    (activeElement === first || !container.contains(activeElement))
  ) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    (activeElement === last || !container.contains(activeElement))
  ) {
    event.preventDefault();
    first.focus();
  }
};

const restoreFocus = (element: HTMLElement | null): void => {
  if (element?.isConnected) element.focus();
};

const stopKeyboardPropagation = (event: Event): void => {
  const target = (event.composedPath()[0] ||
    event.target) as HTMLElement | null;
  if (!target) return;

  if (
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) ||
    target.isContentEditable
  ) {
    event.stopPropagation();
  }
};

export {
  focusFirstElement,
  getFocusableElements,
  restoreFocus,
  stopKeyboardPropagation,
  trapFocus,
};
