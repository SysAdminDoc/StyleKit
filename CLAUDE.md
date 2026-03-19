# CLAUDE.md - StyleKit

## Project Overview
StyleKit is a Chrome/Firefox browser extension (Manifest V3) that lets users customize any website's appearance. Forked from Stylebot, rebranded and enhanced. v4.2.0.

## Tech Stack
- **Framework**: Vue 3 + Vuex 4 + TypeScript
- **Build**: Vite 5 (multi-entry rollup)
- **UI**: Bootstrap 5, bootstrap-vue-3, vue3-swatches, vue-draggable-resizable
- **CSS**: SCSS, PostCSS (cssnano, postcss-rem-to-pixel)
- **Testing**: Vitest + jsdom (tests use globals - no imports needed for describe/it/expect)
- **Linting**: ESLint + Prettier + husky + lint-staged
- **CI**: GitHub Actions (Node 22, npm ci)

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
- Version synced from package.json into manifest at build time

## Key Patterns
- **Shadow DOM**: Editor and readability mount Vue apps inside shadow DOM to isolate from page styles
- **Path aliases**: `@stylekit/*` maps to `src/*/index` (configured in both vite.config.ts and tsconfig.json)
- **Store alias**: `editor/store` maps to `src/editor/store/index`
- **Vue 3 lifecycle**: Uses `beforeUnmount`/`unmounted` (NOT Vue 2's `beforeDestroy`/`destroyed`)
- **Vue 3 v-model**: Uses `modelValue` prop + `update:modelValue` event (not Vue 2's `value`/`input`)
- **Vue 3 reactivity**: Use object spread for reactive updates (NOT `this.$set()`)
- **Content scripts**: ES module format with static imports to shared chunks
- **Web accessible resources**: `chunks/*`, `editor/index.css`, `readability/index.css`, `readability/index.js`, `monaco-editor/*`
- **postMessage**: Uses `chrome.runtime.getURL('/')` as targetOrigin (not wildcard `*`)
- **Sender validation**: Background listener checks `sender.id === chrome.runtime.id`
- **CSS injection**: Uses `textContent` (not `innerHTML`) for style elements
- **CSS removal**: Uses `el.remove()` (not `el.textContent = ''`) to avoid orphan elements
- **Batched CSS updates**: Multi-property changes (clearLayout, applyFontFamily) batch into single `applyCss` dispatch
- **Restricted page detection**: `isRestrictedUrl()` in popup/utils.ts checks chrome://, edge://, about: URLs
- **readyState checks**: Use `document.readyState === 'loading'` pattern (NOT `=== 'complete'`) to handle interactive state

## DOM Element IDs (Legacy - Do Not Rename)
These `stylebot-*` IDs/classes are baked into user-saved CSS selectors and page DOM:
- `#stylebot` — shadow host root
- `#stylebot-app` — Vue app mount inside shadow DOM
- `.stylebot` — class used to exclude editor elements from dark mode processing
- `stylebot-css-{id}` — injected style element IDs
- `stylebot-dark-mode` — dark mode style element
- `stylebot-color-picker` — color picker class in shadow DOM

## Known Issues
- 2/8 test suites fail (pre-existing: FontSize.vue component mount + actions.test.ts mock mismatch with safeParse)
- Sass `@import` deprecation warnings (migrating to `@use` is a future task)
- bootstrap-vue-3 has no TypeScript declarations (shimmed in `shims.vue.d.ts`)
- CSS minification warnings from bootstrap-vue-3 unbalanced braces (library issue)
- Google Drive sync merge is style-level only (per-selector conflicts not handled)

## Version History
- **v4.2.0** — UX improvements: Find Styles retry button, readability toggle revert on failure, restricted page detection in popup, delete confirmation (two-click), saveStyle error feedback wired to UI. Version bump.
- **v4.1.1** — Bug fixes: removeCSSFromDocument memory leak, clearLayout history pollution (15 dispatches -> 1), sync UI lockup, Length NaN/regex bugs, opacity float precision, dark mode + readability readyState race, Monaco regex injection, SPA listener stacking, reader innerHTML.
- **v4.1.0** — Full audit: rebranded `@stylebot/*` to `@stylekit/*` (79 files + 15 locales), security hardening, memory leak fixes, Vue 3 lifecycle migration (9 components), Jest->Vitest test migration (3/5 broken suites fixed), CI modernized (Node 22, npm, actions/v4), ESLint config fixed.
