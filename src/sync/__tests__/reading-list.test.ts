import { mergeReadingLists } from '../reading-list';
import type { ReadingListItem } from '@stylekit/types';

const item = (updatedAt: string, title: string): ReadingListItem => ({
  url: 'https://example.com/article',
  title,
  byline: '',
  siteName: 'Example',
  excerpt: '',
  content: '<p>Offline text.</p>',
  textContent: 'Offline text.',
  addedAt: '2026-08-12T09:00:00.000Z',
  updatedAt,
});

describe('reading-list sync merge', () => {
  it('keeps the newest item update', () => {
    const merged = mergeReadingLists(
      {
        readingList: {
          'https://example.com/article': item(
            '2026-08-12T10:00:00.000Z',
            'Local'
          ),
        },
        readingListTombstones: {},
      },
      {
        readingList: {
          'https://example.com/article': item(
            '2026-08-12T11:00:00.000Z',
            'Remote'
          ),
        },
        readingListTombstones: {},
      }
    );

    expect(merged.readingList['https://example.com/article'].title).toBe(
      'Remote'
    );
  });

  it('applies a deletion newer than the cached item', () => {
    const merged = mergeReadingLists(
      {
        readingList: {
          'https://example.com/article': item(
            '2026-08-12T10:00:00.000Z',
            'Local'
          ),
        },
        readingListTombstones: {},
      },
      {
        readingList: {},
        readingListTombstones: {
          'https://example.com/article': {
            deletedTime: '2026-08-12T11:00:00.000Z',
          },
        },
      }
    );

    expect(merged.readingList).toEqual({});
    expect(
      merged.readingListTombstones['https://example.com/article']
    ).toBeTruthy();
  });
});
