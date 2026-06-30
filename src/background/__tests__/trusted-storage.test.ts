import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = (...parts: string[]): string =>
  readFileSync(join(process.cwd(), ...parts), 'utf8');

describe('trusted storage boundaries', () => {
  it('keeps local storage trusted-only and out of content scripts', () => {
    const backgroundIndex = source('src', 'background', 'index.ts');
    expect(backgroundIndex).toContain('chrome.storage.local.setAccessLevel');
    expect(backgroundIndex).toContain("accessLevel: 'TRUSTED_CONTEXTS'");

    const contentScriptFiles = [
      source('src', 'editor', 'components', 'TheOnboarding.vue'),
      source('src', 'editor', 'components', 'text', 'FontFamilyDropdown.vue'),
      source('src', 'editor', 'utils', 'chrome.ts'),
      source('src', 'inject-css', 'index.ts'),
    ];

    contentScriptFiles.forEach(file => {
      expect(file).not.toContain('chrome.storage.local');
    });
  });
});
