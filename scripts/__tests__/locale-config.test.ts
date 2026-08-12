// @vitest-environment node

import {
  getLocaleIssues,
  parseLocaleConfig,
  toChromeMessages,
} from '../locale-config.mjs';

describe('locale config validation', () => {
  it('parses multiline messages and Chrome placeholders', () => {
    const catalog = parseLocaleConfig(
      `# heading
@greeting
Hello $name$
from StyleKit
`,
      'en.config'
    );

    expect(catalog.messages.get('greeting')).toMatchObject({
      message: 'Hello $name$\nfrom StyleKit',
      placeholders: ['name'],
    });
    expect(toChromeMessages(catalog)).toEqual({
      greeting: {
        message: 'Hello $name$\nfrom StyleKit',
        placeholders: { name: { content: '$1' } },
      },
    });
  });

  it('rejects malformed keys and placeholder delimiters', () => {
    expect(() => parseLocaleConfig('@bad-key\nValue', 'bad.config')).toThrow(
      'malformed locale key'
    );
    expect(() =>
      parseLocaleConfig('@status\nHello $name', 'bad.config')
    ).toThrow('malformed $placeholder$ syntax');
  });

  it('reports missing, extra, and placeholder-drift keys', () => {
    const catalogs = new Map([
      ['en', parseLocaleConfig('@hello\nHello $name$\n\n@goodbye\nBye', 'en')],
      [
        'fr',
        parseLocaleConfig('@hello\nBonjour $person$\n\n@stale\nAncien', 'fr'),
      ],
    ]);

    expect(getLocaleIssues(catalogs)).toEqual([
      'fr: missing goodbye',
      'fr: extra stale',
      'fr.hello: placeholders [person] do not match source [name]',
    ]);
  });
});
