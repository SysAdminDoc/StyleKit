import { format } from 'prettier/standalone';
import postcssPlugin from 'prettier/plugins/postcss';

export const MONACO_FORMAT_ON_SAVE_STORAGE_KEY =
  'stylekit-monaco-format-on-save';

export type MonacoStyleLanguage = 'css' | 'scss';

export const parseFormatOnSave = (value: unknown): boolean => value === true;

export const formatStyleCode = async (
  code: string,
  language: MonacoStyleLanguage
): Promise<string> =>
  format(code, {
    parser: language,
    plugins: [postcssPlugin],
    tabWidth: 2,
    useTabs: false,
  });
