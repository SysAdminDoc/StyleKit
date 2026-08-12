import { describe, expect, it } from 'vitest';

import {
  groupOutdatedDependencies,
  isCompatibilityUpgrade,
  parseVersion,
  renderDependencyReport,
} from './dependency-report.mjs';

describe('dependency compatibility report', () => {
  it('parses stable and prerelease semantic versions', () => {
    expect(parseVersion('v3.5.2')).toEqual({ major: 3, minor: 5, patch: 2 });
    expect(parseVersion('8.0.0-beta.1')).toEqual({
      major: 8,
      minor: 0,
      patch: 0,
    });
    expect(parseVersion('workspace:*')).toBeNull();
  });

  it('treats major and zero-major minor changes as compatibility reviews', () => {
    expect(isCompatibilityUpgrade('3.4.0', '3.5.0')).toBe(false);
    expect(isCompatibilityUpgrade('3.4.0', '4.0.0')).toBe(true);
    expect(isCompatibilityUpgrade('0.47.0', '0.56.0')).toBe(true);
    expect(isCompatibilityUpgrade('file:../local', '1.0.0')).toBeNull();
  });

  it('groups safe updates separately from compatibility reviews', () => {
    const groups = groupOutdatedDependencies({
      vue: {
        current: '3.5.30',
        wanted: '3.5.41',
        latest: '3.5.41',
        type: 'devDependencies',
      },
      eslint: {
        current: '8.57.1',
        wanted: '8.57.1',
        latest: '10.8.1',
        type: 'devDependencies',
      },
      'monaco-editor': {
        current: '0.47.0',
        wanted: '0.47.0',
        latest: '0.56.0',
        type: 'devDependencies',
      },
    });

    expect(groups.safe.map(dependency => dependency.name)).toEqual(['vue']);
    expect(groups.review.map(dependency => dependency.name)).toEqual([
      'eslint',
      'monaco-editor',
    ]);
  });

  it('prints versions, groups, and the local verification lane', () => {
    const report = renderDependencyReport({
      vite: {
        current: '8.1.0',
        wanted: '8.2.1',
        latest: '8.2.1',
        type: 'devDependencies',
      },
    });

    expect(report).toContain('Current  Wanted  Latest');
    expect(report).toContain('vite');
    expect(report).toContain('npm run build:firefox');
    expect(report).toContain('does not modify package files');
  });
});
