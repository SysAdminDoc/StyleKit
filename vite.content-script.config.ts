import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import cssnano from 'cssnano';

const outDir = process.env.BROWSER === 'firefox' ? 'firefox-dist' : 'dist';
const contentScriptName = process.env.STYLEKIT_CONTENT_SCRIPT;
if (contentScriptName !== 'editor' && contentScriptName !== 'inject-css') {
  throw new Error(
    'STYLEKIT_CONTENT_SCRIPT must be either "editor" or "inject-css"'
  );
}
const remValuePattern = /(-?\d*\.?\d+)rem\b/g;

const asciiJavaScriptPlugin = (): Plugin => ({
  name: 'stylekit-ascii-javascript',
  generateBundle(_options, bundle) {
    for (const output of Object.values(bundle)) {
      if (output.type !== 'chunk') continue;
      output.code = output.code.replace(
        /[^\x00-\x7f]/g,
        character =>
          `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
      );
    }
  },
});

const remToPixelPlugin = () => ({
  postcssPlugin: 'stylekit-rem-to-pixel',
  Declaration(decl: { value: string }) {
    decl.value = decl.value.replace(remValuePattern, (_, remValue: string) => {
      const pxValue = Number.parseFloat(remValue) * 16;
      return `${Number.parseFloat(pxValue.toFixed(5))}px`;
    });
  },
});

export default defineConfig({
  // Chrome rejects JavaScript files containing Unicode noncharacters such as
  // U+FFFE, which PostCSS uses in a parser sentinel. Escape non-ASCII code
  // points in the final classic bundle so Chrome can load it as a content script.
  plugins: [vue(), asciiJavaScriptPlugin()],

  resolve: {
    alias: {
      '@stylekit/css': resolve(__dirname, './src/css/index'),
      '@stylekit/i18n': resolve(__dirname, './src/i18n/index'),
      '@stylekit/sync': resolve(__dirname, './src/sync/index'),
      '@stylekit/types': resolve(__dirname, './src/types/index'),
      '@stylekit/utils': resolve(__dirname, './src/utils/index'),
      '@stylekit/dark-mode': resolve(__dirname, './src/dark-mode/index'),
      '@stylekit/settings': resolve(__dirname, './src/settings/index'),
      '@stylekit/readability': resolve(__dirname, './src/readability/index'),
      '@stylekit/highlighter': resolve(__dirname, './src/highlighter/index'),
      '@stylekit/monaco-editor': resolve(
        __dirname,
        './src/monaco-editor/index'
      ),
      'editor/store': resolve(__dirname, './src/editor/store/index'),
    },
  },

  css: {
    postcss: {
      plugins: [cssnano({ preset: 'default' }), remToPixelPlugin()],
    },
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },

  build: {
    outDir,
    emptyOutDir: false,
    cssCodeSplit: true,
    sourcemap: process.env.NODE_ENV !== 'production' ? 'inline' : false,
    target: 'esnext',
    rollupOptions: {
      input: resolve(__dirname, `src/${contentScriptName}/index.ts`),
      output: {
        format: 'cjs',
        entryFileNames: `${contentScriptName}/index.js`,
        assetFileNames: assetInfo => {
          if (assetInfo.names?.some(name => name.endsWith('.css'))) {
            for (const original of assetInfo.originalFileNames || []) {
              const match = original.match(/src\/([^/]+)\//);
              if (match) return `${match[1]}/[name].[ext]`;
            }
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
});
