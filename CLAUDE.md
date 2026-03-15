# CLAUDE.md - StyleKit

## Project Overview
StyleKit is a Chrome/Firefox browser extension (Manifest V3) that lets users customize any website's appearance. Forked from Stylebot, rebranded and enhanced.

## Tech Stack
- **Framework**: Vue 3 + Vuex 4 + TypeScript
- **Build**: Vite 5 (multi-entry rollup)
- **UI**: Bootstrap 5, bootstrap-vue-3, vue3-swatches, vue-draggable-resizable
- **CSS**: SCSS, PostCSS (cssnano, postcss-rem-to-pixel)
- **Testing**: Vitest (tests use globals - no imports needed for describe/it/expect)
- **Linting**: ESLint + Prettier + husky + lint-staged

## Commands
```
npm run build           # Production build -> dist/
npm run build:firefox   # Firefox build -> firefox-dist/
npm run watch           # Dev build with watch
npm run test            # Run tests (vitest)
npm run lint            # ESLint check
npm run lint:fix        # ESLint auto-fix
```

## Project Structure
```
src/
  background/       # MV3 service worker (ES module)
  editor/           # Content script - visual CSS editor (shadow DOM)
  inject-css/       # Content script - applies saved CSS (document_start)
  popup/            # Browser action popup (HTML entry)
  options/          # Extension options page (HTML entry)
  readability/      # Reader mode (shadow DOM)
  monaco-editor/    # Code editor iframe
  sync/             # Google Drive sync
  css/              # PostCSS utilities (parse, declarations, rules)
  dark-mode/        # Dark mode CSS generation
  highlighter/      # Element overlay for inspector
  i18n/             # Internationalization
  settings/         # Default settings/options
  types/            # Shared TypeScript types
  utils/            # Shared utilities
  shared/           # Shared Vue components
  scss/             # Global SCSS (themes, dark palette)
  _locales/         # Chrome i18n locale .config files
  extension/        # manifest.json, icons
```

## Build Architecture
- Entry points defined in `vite.config.ts` via `rollupOptions.input`
- Content scripts require `"type": "module"` in manifest (Chrome 121+)
- Shared code is split into `chunks/` directory
- CSS is output per entry point directory (e.g., `editor/index.css`)
- `copyAssetsPlugin` handles manifest, icons, Monaco, and HTML file copying
- `localePlugin` transforms `.config` locale files to Chrome `_locales` JSON

## Key Patterns
- **Shadow DOM**: Editor and readability mount Vue apps inside shadow DOM to isolate from page styles
- **Path aliases**: `@stylebot/*` maps to `src/*/index` (configured in both vite.config.ts and tsconfig.json)
- **Store alias**: `editor/store` maps to `src/editor/store/index`
- **Vue 3 v-model**: Uses `modelValue` prop + `update:modelValue` event (not Vue 2's `value`/`input`)
- **Content scripts**: ES module format with static imports to shared chunks
- **Web accessible resources**: `chunks/*`, `editor/index.css`, `readability/index.css`, `readability/index.js`, `monaco-editor/*`

## Known Issues
- Test files use Jest APIs (`jest.mock`, `fetchMock`) that need migration to Vitest equivalents
- Sass `@import` deprecation warnings (migrating to `@use` is a future task)
- bootstrap-vue-3 has no TypeScript declarations (shimmed in `shims.vue.d.ts`)
- CSS minification warnings from bootstrap-vue-3 unbalanced braces (library issue)
