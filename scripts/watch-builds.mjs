import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const viteCli = resolve(root, 'node_modules/vite/bin/vite.js');

const run = (args, environment = {}) =>
  spawn(process.execPath, [viteCli, ...args], {
    cwd: root,
    env: { ...process.env, ...environment },
    stdio: 'inherit',
  });

const initialBuild = run(['build']);
const initialExitCode = await new Promise(resolveExit =>
  initialBuild.once('exit', code => resolveExit(code ?? 1))
);
if (initialExitCode !== 0) process.exit(initialExitCode);

const watchers = [
  run(['build', '--watch'], { STYLEKIT_PRESERVE_OUTDIR: '1' }),
  run(['build', '--watch', '--config', 'vite.content-script.config.ts'], {
    STYLEKIT_CONTENT_SCRIPT: 'editor',
  }),
  run(['build', '--watch', '--config', 'vite.content-script.config.ts'], {
    STYLEKIT_CONTENT_SCRIPT: 'inject-css',
  }),
];

const stop = signal => {
  watchers.forEach(child => child.kill(signal));
};

process.once('SIGINT', () => stop('SIGINT'));
process.once('SIGTERM', () => stop('SIGTERM'));

const exitCode = await Promise.race(
  watchers.map(
    child =>
      new Promise(resolveExit =>
        child.once('exit', code => resolveExit(code ?? 1))
      )
  )
);
stop('SIGTERM');
process.exit(exitCode);
