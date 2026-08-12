import type { ReadabilityArticle, ReadingListItemDraft } from '@stylekit/types';

const ALLOWED_TAGS = new Set([
  'A',
  'ABBR',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'BR',
  'CAPTION',
  'CODE',
  'COL',
  'COLGROUP',
  'DD',
  'DEL',
  'DETAILS',
  'DIV',
  'DL',
  'DT',
  'EM',
  'FIGCAPTION',
  'FIGURE',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HR',
  'I',
  'INS',
  'KBD',
  'LI',
  'MAIN',
  'MARK',
  'OL',
  'P',
  'PRE',
  'Q',
  'S',
  'SECTION',
  'SMALL',
  'SPAN',
  'STRONG',
  'SUB',
  'SUMMARY',
  'SUP',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'U',
  'UL',
]);

const TABLE_ATTRIBUTES = new Set(['colspan', 'rowspan', 'scope']);
const DROP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'FORM',
  'INPUT',
  'BUTTON',
  'TEXTAREA',
  'SELECT',
  'SVG',
  'MATH',
  'IMG',
  'VIDEO',
  'AUDIO',
  'SOURCE',
  'LINK',
  'META',
]);

const normalizeHttpUrl = (value: string, baseUrl?: string): string => {
  const url = new URL(value, baseUrl);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Reading-list URLs must use HTTP or HTTPS');
  }
  url.hash = '';
  return url.href;
};

export const sanitizeReadingListContent = (
  content: string,
  pageUrl: string
): { content: string; textContent: string } => {
  const document = new DOMParser().parseFromString(
    `<article>${content}</article>`,
    'text/html'
  );
  const root = document.body.firstElementChild;
  if (!root) throw new Error('The article did not contain readable content');

  for (const element of Array.from(root.querySelectorAll('*'))) {
    if (!ALLOWED_TAGS.has(element.tagName)) {
      if (DROP_TAGS.has(element.tagName)) element.remove();
      else element.replaceWith(...Array.from(element.childNodes));
      continue;
    }

    for (const attribute of Array.from(element.attributes)) {
      const keepHref = element.tagName === 'A' && attribute.name === 'href';
      const keepTableAttribute =
        ['TD', 'TH'].includes(element.tagName) &&
        TABLE_ATTRIBUTES.has(attribute.name);
      if (!keepHref && !keepTableAttribute) {
        element.removeAttribute(attribute.name);
      }
    }

    if (element.tagName === 'A' && element.hasAttribute('href')) {
      try {
        element.setAttribute(
          'href',
          normalizeHttpUrl(element.getAttribute('href') || '', pageUrl)
        );
        element.setAttribute('target', '_blank');
        element.setAttribute('rel', 'noopener noreferrer');
      } catch {
        element.removeAttribute('href');
      }
    }
  }

  const textContent = (root.textContent || '').replace(/\s+/g, ' ').trim();
  if (!textContent)
    throw new Error('The article did not contain readable text');
  return { content: root.innerHTML, textContent };
};

export const createReadingListDraft = (
  article: ReadabilityArticle,
  pageUrl: string
): ReadingListItemDraft => {
  const url = normalizeHttpUrl(pageUrl);
  const sanitized = sanitizeReadingListContent(article.content, url);
  const title = article.title?.trim() || new URL(url).hostname;

  return {
    url,
    title: title.slice(0, 500),
    byline: (article.byline || '').trim().slice(0, 500),
    siteName: (article.siteName || new URL(url).hostname).trim().slice(0, 200),
    excerpt: (article.excerpt || sanitized.textContent.slice(0, 280))
      .trim()
      .slice(0, 500),
    content: sanitized.content,
    textContent: sanitized.textContent,
  };
};
