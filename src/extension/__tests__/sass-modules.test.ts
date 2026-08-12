import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const collectStyleSources = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectStyleSources(path);
    return /\.(scss|vue)$/.test(entry.name) ? [path] : [];
  });

describe('Sass module policy', () => {
  it('keeps project style sources free of deprecated Sass imports', () => {
    const deprecatedImports = collectStyleSources(join(process.cwd(), 'src'))
      .flatMap(path =>
        readFileSync(path, 'utf8')
          .split(/\r?\n/)
          .map((line, index) => ({
            path,
            line: index + 1,
            source: line.trim(),
          }))
      )
      .filter(({ source }) => /^@import\s+/.test(source));

    expect(deprecatedImports).toEqual([]);
  });

  it('loads nested editor and reader styles through the module API', () => {
    const editor = readFileSync(
      join(process.cwd(), 'src/editor/index.scss'),
      'utf8'
    );
    const readability = readFileSync(
      join(process.cwd(), 'src/readability/index.scss'),
      'utf8'
    );

    expect(editor).toContain("@use 'sass:meta'");
    expect(editor).toContain("@include meta.load-css('scss/dark-mode')");
    expect(readability).toContain("@include meta.load-css('./scss/content')");
  });
});
