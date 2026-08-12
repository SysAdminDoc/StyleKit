import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const VERIFICATION_COMMANDS = [
  'npm ci',
  'npm run test',
  'npm run lint',
  'npm run build',
  'npm run build:firefox',
  'npm audit',
];

export const parseVersion = version => {
  const match = String(version ?? '').match(/^(?:v)?(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
};

export const isCompatibilityUpgrade = (current, target) => {
  const from = parseVersion(current);
  const to = parseVersion(target);
  if (!from || !to) return null;

  if (from.major !== to.major) return true;
  return from.major === 0 && from.minor !== to.minor;
};

export const groupOutdatedDependencies = outdated => {
  const dependencies = Object.entries(outdated)
    .filter(([, details]) => details && typeof details === 'object')
    .map(([name, details]) => ({
      name,
      type: details.type ?? 'unknown',
      current: details.current ?? 'missing',
      wanted: details.wanted ?? 'unknown',
      latest: details.latest ?? 'unknown',
    }))
    .sort((left, right) => left.name.localeCompare(right.name));

  const safe = dependencies.filter(dependency => {
    if (dependency.current === dependency.wanted) return false;
    return (
      isCompatibilityUpgrade(dependency.current, dependency.wanted) === false
    );
  });

  const review = dependencies.filter(dependency => {
    if (dependency.current === dependency.latest) return false;
    return (
      isCompatibilityUpgrade(dependency.current, dependency.latest) !== false
    );
  });

  const latestCompatible = dependencies.filter(dependency => {
    if (
      dependency.current === dependency.latest ||
      dependency.current !== dependency.wanted
    ) {
      return false;
    }
    return (
      isCompatibilityUpgrade(dependency.current, dependency.latest) === false
    );
  });

  return { dependencies, safe, review, latestCompatible };
};

const renderGroup = (title, dependencies) => {
  const lines = [`\n${title} (${dependencies.length})`];
  if (dependencies.length === 0) return [...lines, '  None'];

  const nameWidth = Math.max(
    'Dependency'.length,
    ...dependencies.map(dependency => dependency.name.length)
  );
  lines.push(
    `  ${'Dependency'.padEnd(nameWidth)}  ${'Type'.padEnd(16)}  Current  Wanted  Latest`
  );

  dependencies.forEach(dependency => {
    lines.push(
      `  ${dependency.name.padEnd(nameWidth)}  ${dependency.type.padEnd(16)}  ${dependency.current.padEnd(7)}  ${dependency.wanted.padEnd(6)}  ${dependency.latest}`
    );
  });

  return lines;
};

export const renderDependencyReport = outdated => {
  const groups = groupOutdatedDependencies(outdated);
  const lines = [
    'StyleKit dependency compatibility report',
    `Outdated direct dependencies: ${groups.dependencies.length}`,
    ...renderGroup(
      'Safe patch/minor updates within the current compatibility band',
      groups.safe
    ),
    ...renderGroup('Major or compatibility-review upgrades', groups.review),
    ...renderGroup(
      'Compatible latest versions blocked by the declared range',
      groups.latestCompatible
    ),
    '\nVerification required after each upgrade batch:',
    ...VERIFICATION_COMMANDS.map(command => `  ${command}`),
    '\nThis report is advisory and does not modify package files.',
  ];

  return lines.join('\n');
};

const parseOutdatedJson = stdout => {
  const trimmed = stdout.trim();
  if (!trimmed) return {};

  const parsed = JSON.parse(trimmed);
  if (parsed.error) {
    throw new Error(
      parsed.error.summary ?? parsed.error.code ?? 'npm outdated failed'
    );
  }
  return parsed;
};

export const runDependencyReport = () => {
  const npmCli = process.env.npm_execpath;
  const command = npmCli
    ? process.execPath
    : process.platform === 'win32'
      ? 'npm.cmd'
      : 'npm';
  const args = npmCli
    ? [npmCli, 'outdated', '--json', '--long']
    : ['outdated', '--json', '--long'];
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      result.stderr.trim() || `npm outdated exited with ${result.status}`
    );
  }

  return renderDependencyReport(parseOutdatedJson(result.stdout));
};

const isMain =
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    console.log(runDependencyReport());
  } catch (error) {
    console.error(`Unable to build dependency report: ${error.message}`);
    process.exitCode = 2;
  }
}
