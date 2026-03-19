/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'fs';
import cssnano from 'cssnano';
import postcssRemToPixel from 'postcss-rem-to-pixel';

const outDir = process.env.BROWSER === 'firefox' ? 'firefox-dist' : 'dist';

// Transform locale .config files to Chrome _locales JSON format
function localePlugin() {
  return {
    name: 'locale-transform',
    closeBundle() {
      const localesDir = resolve(__dirname, 'src/_locales');
      const files = readdirSync(localesDir).filter((f: string) => f.endsWith('.config'));

      files.forEach((file: string) => {
        const locale = file.replace('.config', '');
        const raw = readFileSync(resolve(localesDir, file), 'utf-8');
        const content = raw.replace(/^#.*?$/gm, '');
        const messages: Record<string, any> = {};
        const regex = /@([a-z0-9_]+)/gi;

        let match;
        while ((match = regex.exec(content))) {
          const messageName = match[1];
          const messageStart = match.index + match[0].length;
          let messageEnd = content.indexOf('@', messageStart);
          if (messageEnd < 0) messageEnd = content.length;

          const message = content.substring(messageStart, messageEnd).trim();
          messages[messageName] = { message };

          const placeholderMatches = [...message.matchAll(/\$([^$]+)\$/g)];
          if (placeholderMatches.length > 0) {
            messages[messageName].placeholders = {};
            placeholderMatches.forEach((m) => {
              messages[messageName].placeholders[m[1]] = { content: '$1' };
            });
          }
        }

        const outPath = resolve(__dirname, outDir, '_locales', locale);
        if (!existsSync(outPath)) mkdirSync(outPath, { recursive: true });
        writeFileSync(resolve(outPath, 'messages.json'), JSON.stringify(messages, null, 2));
      });
    },
  };
}

// Copy static assets and manifest
function copyAssetsPlugin() {
  return {
    name: 'copy-assets',
    closeBundle() {
      // Copy manifest
      const manifestPath = resolve(__dirname, 'src/extension/manifest.json');
      let manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

      if (process.env.BROWSER === 'firefox') {
        const firefoxPath = resolve(__dirname, 'src/extension/manifest-firefox.json');
        if (existsSync(firefoxPath)) {
          const firefoxManifest = JSON.parse(readFileSync(firefoxPath, 'utf-8'));
          manifest = { ...manifest, ...firefoxManifest };
        }
      }

      // Update version from package.json
      const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'));
      manifest.version = pkg.version;

      writeFileSync(resolve(__dirname, outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

      // Copy icons
      const imgSrc = resolve(__dirname, 'src/extension/img');
      const imgDest = resolve(__dirname, outDir, 'img');
      if (existsSync(imgSrc)) cpSync(imgSrc, imgDest, { recursive: true });

      // Copy Monaco editor assets
      const monacoSrc = resolve(__dirname, 'node_modules/monaco-editor/min');
      const monacoDest = resolve(__dirname, outDir, 'monaco-editor/iframe/monaco-editor/min');
      if (existsSync(monacoSrc)) cpSync(monacoSrc, monacoDest, { recursive: true });

      // Copy Monaco iframe HTML
      const monacoHtml = resolve(__dirname, 'src/monaco-editor/iframe/index.html');
      const monacoHtmlDest = resolve(__dirname, outDir, 'monaco-editor/iframe');
      if (!existsSync(monacoHtmlDest)) mkdirSync(monacoHtmlDest, { recursive: true });
      if (existsSync(monacoHtml)) {
        cpSync(monacoHtml, resolve(monacoHtmlDest, 'index.html'));
      }

      // Copy popup and options HTML
      for (const page of ['popup', 'options']) {
        const htmlSrc = resolve(__dirname, `src/${page}/index.html`);
        const htmlDest = resolve(__dirname, outDir, page);
        if (!existsSync(htmlDest)) mkdirSync(htmlDest, { recursive: true });
        if (existsSync(htmlSrc)) {
          cpSync(htmlSrc, resolve(htmlDest, 'index.html'));
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), localePlugin(), copyAssetsPlugin()],

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
      '@stylekit/monaco-editor': resolve(__dirname, './src/monaco-editor/index'),
      'editor/store': resolve(__dirname, './src/editor/store/index'),
    },
  },

  css: {
    postcss: {
      plugins: [
        cssnano({ preset: 'default' }),
        postcssRemToPixel({ propList: ['*'] }),
      ],
    },
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },

  test: {
    globals: true,
    environmentMatchGlobs: [
      ['src/editor/**/__tests__/**', 'jsdom'],
    ],
  },

  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production' ? 'inline' : false,
    minify: process.env.NODE_ENV === 'production',
    target: 'esnext',

    rollupOptions: {
      input: {
        'background/index': resolve(__dirname, 'src/background/index.ts'),
        'popup/index': resolve(__dirname, 'src/popup/index.ts'),
        'editor/index': resolve(__dirname, 'src/editor/index.ts'),
        'options/index': resolve(__dirname, 'src/options/index.ts'),
        'inject-css/index': resolve(__dirname, 'src/inject-css/index.ts'),
        'readability/index': resolve(__dirname, 'src/readability/index.ts'),
        'sync/index': resolve(__dirname, 'src/sync/index.ts'),
        'monaco-editor/iframe/index': resolve(__dirname, 'src/monaco-editor/iframe/index.ts'),
      },

      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.names?.some((n: string) => n.endsWith('.css'))) {
            // Place CSS next to their entry points using originalFileNames
            const originals = assetInfo.originalFileNames || [];
            for (const orig of originals) {
              const match = orig.match(/src\/([^/]+)\//);
              if (match) {
                return `${match[1]}/[name].[ext]`;
              }
            }
          }
          return 'assets/[name]-[hash].[ext]';
        },
      },
    },
  },
});
