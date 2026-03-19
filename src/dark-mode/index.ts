import dedent from 'dedent';
import tinycolor from 'tinycolor2';

import { getSelector } from '@stylekit/css';

declare global {
  interface Window {
    stylebotDarkModeUrl: string;
    stylebotDarkModeObserver: MutationObserver | null;
  }
}

const Theme = {
  color: tinycolor('#e8e6e3'),
  backgroundColor: tinycolor('#222'),
  borderColor: tinycolor('#736b5e'),
  placeholder: tinycolor('#b2aba1'),
  linkColor: tinycolor('#A9BAC5'),
  selectionColor: tinycolor('#fff'),
  selectionBackgroundColor: tinycolor('#68C2D0'),
};

const getDarkModeBackgroundColor = (
  color: tinycolor.Instance
): tinycolor.Instance | null => {
  if (color.getAlpha() === 0) {
    return null;
  }

  if (color.isDark()) {
    return color;
  }

  return color.darken(90);
};

const getDarkModeColor = (
  color: tinycolor.Instance
): tinycolor.Instance | null => {
  if (color.getAlpha() === 0) {
    return Theme.color;
  }

  if (color.isLight()) {
    return color;
  }

  return color.lighten(50);
};

const getDarkModeBorderColor = (
  color: tinycolor.Instance
): tinycolor.Instance | null => {
  if (color.isLight()) {
    return color.darken(70);
  }

  return color.lighten(30);
};

const getDefaultCss = (): string => {
  return dedent`
    html, body, input, textarea, select, button {
      color: ${Theme.color.toHexString()};
      border-color: ${Theme.borderColor.toHexString()};
      background-color: ${Theme.backgroundColor.toHexString()};
    }

    ::placeholder {
      color: ${Theme.placeholder.toHexString()};
    }

    a {
      color: ${Theme.linkColor.toHexString()};
    }

    ::selection {
      color: ${Theme.selectionColor.toHexString()};
      background: ${Theme.selectionBackgroundColor.toHexString()};
    }
  `;
};

const getElementCss = (el: HTMLElement, selector: string): string => {
  const computedStyle = getComputedStyle(el);
  const isLinkOrButton = el.matches('a, button');

  const color = getDarkModeColor(tinycolor(computedStyle.color));
  const backgroundColor = getDarkModeBackgroundColor(
    tinycolor(computedStyle.backgroundColor)
  );
  const borderColor = getDarkModeBorderColor(
    tinycolor(computedStyle.borderColor)
  );

  if (!color && !backgroundColor) {
    return '';
  }

  let css = `\n\n${selector} {`;

  if (color) {
    css += `\n  color: ${color.toHexString()} !important;`;
  }

  if (backgroundColor) {
    css += `\n  background-color: ${backgroundColor.toHexString()} !important;`;
  }

  if (borderColor) {
    css += `\n  border-color: ${borderColor.toHexString()} !important;`;
  }

  css += `\n}`;

  if (isLinkOrButton && (color || backgroundColor)) {
    css += `\n${selector}:hover {`;

    if (color) {
      css += `\n  color: ${color.lighten(20).toHexString()} !important;`;
    }

    if (backgroundColor) {
      css += `\n  background-color: ${backgroundColor
        .darken(30)
        .toHexString()} !important;`;
    }

    css += `\n}`;
  }

  return css;
};

// Track which selectors we've already processed
const evaluatedSelectors = new Set<string>();

const processElements = (elements: Iterable<Element>): string => {
  let css = '';

  for (const el of elements) {
    if (el.closest('.stylebot')) continue;

    const selector = getSelector(el as HTMLElement);

    try {
      if (!evaluatedSelectors.has(selector)) {
        const elementCss = getElementCss(el as HTMLElement, selector);
        if (elementCss) {
          css += elementCss;
        }
        evaluatedSelectors.add(selector);
      }
    } catch (e) {
      // skip elements that can't be analyzed
    }
  }

  return css;
};

const getStyleElement = (): HTMLStyleElement => {
  const id = 'stylebot-dark-mode';
  let el = document.getElementById(id) as HTMLStyleElement | null;

  if (!el) {
    el = document.createElement('style');
    el.type = 'text/css';
    el.setAttribute('id', id);
    document.documentElement.appendChild(el);
  }

  return el;
};

const initDarkMode = (): void => {
  evaluatedSelectors.clear();

  // Start with base theme CSS
  let css = getDefaultCss();

  // Process all existing elements
  const all = document.querySelectorAll('body, body *:not(#stylebot)');
  css += processElements(all);

  const styleEl = getStyleElement();
  styleEl.textContent = css;

  // Observe DOM mutations for dynamically added elements
  startObserver(styleEl);
};

let mutationBuffer: MutationRecord[] = [];
let flushScheduled = false;

const flushMutations = (styleEl: HTMLStyleElement): void => {
  flushScheduled = false;

  const newElements: Element[] = [];
  for (const mutation of mutationBuffer) {
    for (const node of Array.from(mutation.addedNodes)) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        if (!el.closest('.stylebot') && el.id !== 'stylebot-dark-mode') {
          newElements.push(el);
          // Also grab children of newly added subtrees
          el.querySelectorAll('*').forEach(child => newElements.push(child));
        }
      }
    }
  }
  mutationBuffer = [];

  if (newElements.length === 0) return;

  const newCss = processElements(newElements);
  if (newCss) {
    styleEl.textContent += newCss;
  }
};

const startObserver = (styleEl: HTMLStyleElement): void => {
  stopObserver();

  const observer = new MutationObserver((mutations) => {
    mutationBuffer.push(...mutations);

    if (!flushScheduled) {
      flushScheduled = true;
      requestAnimationFrame(() => flushMutations(styleEl));
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.stylebotDarkModeObserver = observer;
};

const stopObserver = (): void => {
  if (window.stylebotDarkModeObserver) {
    window.stylebotDarkModeObserver.disconnect();
    window.stylebotDarkModeObserver = null;
  }
};

const cacheCurrentUrl = (): void => {
  window.stylebotDarkModeUrl = window.location.href;
};

const didUrlChange = (): boolean => {
  return window.stylebotDarkModeUrl !== window.location.href;
};

export const apply = (forceApply = false): void => {
  // Prevent duplicate calls for the same url if not force applying
  if (!forceApply && !didUrlChange()) {
    return;
  }
  cacheCurrentUrl();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initDarkMode());
  } else {
    initDarkMode();
  }
};

export const remove = (): void => {
  stopObserver();
  evaluatedSelectors.clear();
  document.getElementById('stylebot-dark-mode')?.remove();
};
