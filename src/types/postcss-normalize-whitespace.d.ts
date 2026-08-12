declare module 'postcss-normalize-whitespace' {
  import type { PluginCreator } from 'postcss';

  const normalizeWhitespace: PluginCreator<void>;
  export default normalizeWhitespace;
}
