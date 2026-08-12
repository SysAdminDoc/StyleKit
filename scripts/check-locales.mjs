import { resolve } from 'node:path';
import {
  fixLocaleCompleteness,
  getLocaleIssues,
  readLocaleCatalogs,
} from './locale-config.mjs';

const localesDir = resolve(import.meta.dirname, '../src/_locales');
if (process.argv.includes('--fix')) fixLocaleCompleteness(localesDir);

const catalogs = readLocaleCatalogs(localesDir);
const issues = getLocaleIssues(catalogs);
if (issues.length) {
  console.error(`Locale completeness failed:\n- ${issues.join('\n- ')}`);
  process.exitCode = 1;
} else {
  const sourceCount = catalogs.get('en')?.messages.size || 0;
  console.log(
    `Locale completeness passed: ${catalogs.size} locales, ${sourceCount} source keys.`
  );
}
