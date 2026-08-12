export const getClassBasedSelector = (el: HTMLElement): string | null => {
  const className = el
    .getAttribute('class')
    ?.trim()
    .replace(/\s{2,}/g, ' ');

  if (className) {
    const tag = el.tagName.toLowerCase();
    const classes = className.split(' ').map(value => CSS.escape(value));
    const count = (selector: string): number => {
      try {
        return document.querySelectorAll(selector).length;
      } catch {
        return Number.POSITIVE_INFINITY;
      }
    };
    const ranked = classes
      .map(value => ({
        value,
        count: Math.min(count(`.${value}`), count(`${tag}.${value}`)),
      }))
      .sort((left, right) =>
        left.count !== right.count
          ? left.count - right.count
          : left.value.localeCompare(right.value)
      );

    const uniqueSingles = ranked.flatMap(({ value }) =>
      [`.${value}`, `${tag}.${value}`].filter(selector => count(selector) === 1)
    );
    if (uniqueSingles.length > 0) {
      return uniqueSingles.sort((left, right) => left.length - right.length)[0];
    }

    const selected: string[] = [];
    for (const { value } of ranked) {
      selected.push(value);
      if (selected.length < 2) continue;
      const classSelector = `.${selected.join('.')}`;
      const tagSelector = `${tag}${classSelector}`;
      if (count(classSelector) === 1) return classSelector;
      if (count(tagSelector) === 1) return tagSelector;
    }

    return `${tag}.${classes.join('.')}`;
  }

  return null;
};

export const getIdBasedSelector = (el: HTMLElement): string | null => {
  const id = el.getAttribute('id');
  if (id) {
    return `#${CSS.escape(id)}`;
  }

  return null;
};

export const getTagNameBasedSelector = (
  el: HTMLElement,
  domHeirarchyLevel = 0
): string => {
  const tagName = el.tagName.toLowerCase();

  // don't go beyond 2 levels up the DOM
  if (domHeirarchyLevel < 2 && el.parentElement) {
    const parent = el.parentElement;
    const parentSelector = getTagNameBasedSelector(
      parent,
      domHeirarchyLevel + 1
    );

    return `${parentSelector} ${tagName}`;
  }

  return tagName;
};

export const getSelector = (el: HTMLElement): string => {
  let selector = getIdBasedSelector(el);

  if (!selector) {
    selector = getClassBasedSelector(el);
  }

  if (!selector) {
    return getTagNameBasedSelector(el);
  }

  return selector;
};

export const splitSelectorList = (selector: string): string[] => {
  const selectors: string[] = [];
  let current = '';
  let quote = '';
  let escaped = false;
  let depth = 0;

  for (const character of selector) {
    if (escaped) {
      current += character;
      escaped = false;
      continue;
    }
    if (character === '\\') {
      current += character;
      escaped = true;
      continue;
    }
    if (quote) {
      current += character;
      if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      current += character;
      quote = character;
      continue;
    }
    if (character === '(' || character === '[') depth += 1;
    if (character === ')' || character === ']') depth = Math.max(0, depth - 1);
    if (character === ',' && depth === 0) {
      if (current.trim()) selectors.push(current.trim());
      current = '';
      continue;
    }
    current += character;
  }

  if (current.trim()) selectors.push(current.trim());
  return selectors;
};

export const appendSelector = (current: string, next: string): string => {
  const selectors = [...splitSelectorList(current), ...splitSelectorList(next)];
  return [...new Set(selectors)].join(', ');
};

export const validateSelector = (selector: string): boolean => {
  if (!selector) {
    return false;
  }

  try {
    document.querySelector(selector);
    return true;
  } catch (e) {
    return false;
  }
};
