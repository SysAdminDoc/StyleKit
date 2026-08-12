import {
  countWords,
  DEFAULT_READING_WORDS_PER_MINUTE,
  getReadingMetrics,
} from '../reading-metrics';

describe('reading metrics', () => {
  it('counts natural-language words without counting punctuation', () => {
    expect(countWords("Hello, reader! It's a well-tested article.")).toBe(7);
    expect(countWords('  Multiple\n\tspaces stay harmless.  ')).toBe(4);
    expect(countWords('🎉 — ...')).toBe(0);
  });

  it('uses Unicode-aware segmentation for text without Latin spaces', () => {
    expect(countWords('你好世界。这是一篇文章。')).toBeGreaterThan(1);
  });

  it('estimates whole reading minutes at a documented default rate', () => {
    expect(DEFAULT_READING_WORDS_PER_MINUTE).toBe(225);
    expect(getReadingMetrics('word '.repeat(225))).toEqual({
      wordCount: 225,
      readingMinutes: 1,
    });
    expect(getReadingMetrics('word '.repeat(226))).toEqual({
      wordCount: 226,
      readingMinutes: 2,
    });
    expect(getReadingMetrics('')).toEqual({
      wordCount: 0,
      readingMinutes: 0,
    });
  });

  it('accepts a custom rate and safely falls back from invalid rates', () => {
    const text = 'word '.repeat(300);
    expect(getReadingMetrics(text, 300).readingMinutes).toBe(1);
    expect(getReadingMetrics(text, 0).readingMinutes).toBe(2);
  });
});
