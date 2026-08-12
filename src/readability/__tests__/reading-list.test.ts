// @vitest-environment jsdom

import {
  createReadingListDraft,
  sanitizeReadingListContent,
} from '../reading-list';

describe('reading-list capture', () => {
  it('keeps readable structure while removing active and remote-only content', () => {
    const snapshot = sanitizeReadingListContent(
      '<p onclick="alert(1)">Hello <strong>reader</strong></p>' +
        '<script>alert(1)</script><img src="https://example.com/tracker.png">' +
        '<a href="/next" style="color:red">Next</a>',
      'https://example.com/articles/story#section'
    );

    expect(snapshot.content).toContain('<strong>reader</strong>');
    expect(snapshot.content).toContain('href="https://example.com/next"');
    expect(snapshot.content).not.toMatch(/onclick|script|img|style=/);
    expect(snapshot.textContent).toBe('Hello readerNext');
  });

  it('creates a canonical, bounded snapshot draft', () => {
    const draft = createReadingListDraft(
      {
        title: ' A useful article ',
        byline: ' Ada ',
        siteName: '',
        content: '<p>Saved body</p>',
        excerpt: 'Short summary',
      },
      'https://example.com/story#comments'
    );

    expect(draft.url).toBe('https://example.com/story');
    expect(draft.title).toBe('A useful article');
    expect(draft.siteName).toBe('example.com');
    expect(draft.textContent).toBe('Saved body');
  });
});
