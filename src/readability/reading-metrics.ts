export type ReadingMetrics = {
  wordCount: number;
  readingMinutes: number;
};

export const DEFAULT_READING_WORDS_PER_MINUTE = 225;

const countWordsWithFallback = (text: string): number =>
  text.match(/[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu)?.length || 0;

export const countWords = (value: string): number => {
  const text = value.replace(/\s+/g, ' ').trim();
  if (!text) return 0;

  if (typeof Intl.Segmenter === 'function') {
    const segments = new Intl.Segmenter(undefined, {
      granularity: 'word',
    }).segment(text);
    let count = 0;
    for (const segment of segments) {
      if (segment.isWordLike) count += 1;
    }
    return count;
  }

  return countWordsWithFallback(text);
};

export const getReadingMetrics = (
  text: string,
  wordsPerMinute = DEFAULT_READING_WORDS_PER_MINUTE
): ReadingMetrics => {
  const wordCount = countWords(text);
  const normalizedRate =
    Number.isFinite(wordsPerMinute) && wordsPerMinute > 0
      ? wordsPerMinute
      : DEFAULT_READING_WORDS_PER_MINUTE;

  return {
    wordCount,
    readingMinutes: wordCount
      ? Math.max(1, Math.ceil(wordCount / normalizedRate))
      : 0,
  };
};
