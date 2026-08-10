import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  DISALLOWED_BROAD_WEB_ACCESSIBLE_RESOURCES,
  collectImportedWebAccessibleResources,
  createWebAccessibleResourceRules,
} from '../web-accessible-resources';

const readManifest = (): { web_accessible_resources: { resources: string[] }[] } =>
  JSON.parse(
    readFileSync(join(process.cwd(), 'src/extension/manifest.json'), 'utf8')
  );

describe('web accessible resource policy', () => {
  it('keeps the source manifest allowlist narrow', () => {
    const resources = readManifest().web_accessible_resources.flatMap(
      rule => rule.resources
    );

    expect(resources).toEqual([
      'editor/index.css',
      'monaco-editor/iframe/index.html',
      'readability/index.css',
    ]);

    DISALLOWED_BROAD_WEB_ACCESSIBLE_RESOURCES.forEach(pattern => {
      expect(resources).not.toContain(pattern);
    });
  });

  it('publishes only content-script imports and direct page loads', () => {
    const bundle = {
      'editor/index.js': {
        type: 'chunk',
        imports: ['chunks/editor.js', 'readability/index.js'],
      },
      'inject-css/index.js': {
        type: 'chunk',
        imports: ['chunks/inject.js', 'readability/index.js'],
      },
      'readability/index.js': {
        type: 'chunk',
        imports: ['chunks/readability.js'],
      },
      'chunks/editor.js': {
        type: 'chunk',
        imports: ['chunks/shared.js'],
      },
      'chunks/inject.js': {
        type: 'chunk',
        imports: ['chunks/shared.js'],
      },
      'chunks/readability.js': {
        type: 'chunk',
        imports: [],
      },
      'chunks/shared.js': {
        type: 'chunk',
        imports: [],
      },
      'chunks/unused.js': {
        type: 'chunk',
        imports: [],
      },
    };

    const importedResources = collectImportedWebAccessibleResources(bundle);
    expect(importedResources).toEqual([
      'chunks/editor.js',
      'chunks/inject.js',
      'chunks/readability.js',
      'chunks/shared.js',
      'readability/index.js',
    ]);

    const [chromeRule] = createWebAccessibleResourceRules(
      importedResources,
      true
    );

    expect(chromeRule.use_dynamic_url).toBe(true);
    expect(chromeRule.resources).toEqual([
      'chunks/editor.js',
      'chunks/inject.js',
      'chunks/readability.js',
      'chunks/shared.js',
      'editor/index.css',
      'monaco-editor/iframe/index.html',
      'readability/index.css',
      'readability/index.js',
    ]);
    expect(chromeRule.resources).not.toContain('chunks/unused.js');
  });
});
