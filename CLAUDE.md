# CLAUDE.md - StyleKit

## Project Overview
StyleKit is a Chrome/Firefox browser extension (Manifest V3) that lets users customize any website's appearance. Forked from Stylebot, rebranded and enhanced. v1.1.0.

## Tech Stack
- **Framework**: Vue 3 + Vuex 4 + TypeScript
- **Build**: Vite 5 (multi-entry rollup)
- **UI**: Bootstrap 5, bootstrap-vue-3, vue3-swatches, vue-draggable-resizable
- **CSS**: SCSS, PostCSS (cssnano, postcss-rem-to-pixel)
- **Testing**: Vitest + jsdom (8/8 suites, 76/76 tests)
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
  highlighter/      # Element overlay for inspector + accessibility info
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
- **Google Fonts**: Fetched from metadata API, cached in `chrome.storage.local` for 1 week (`stylekit-google-fonts` key)
- **Multi-select**: Highlighter tracks `lastSelector`; Shift+click appends with comma separator
- **Accessibility overlay**: Overlay tooltip shows ARIA role + WCAG contrast ratio via `getContrastRatio()` in Overlay.ts
- **Responsive preview**: Sets `max-width` on `document.documentElement` with `margin: 0 auto` to simulate breakpoints

## DOM Element IDs (Legacy - Do Not Rename)
These `stylebot-*` IDs/classes are baked into user-saved CSS selectors and page DOM:
- `#stylebot` — shadow host root
- `#stylebot-app` — Vue app mount inside shadow DOM
- `.stylebot` — class used to exclude editor elements from dark mode processing
- `stylebot-css-{id}` — injected style element IDs
- `stylebot-dark-mode` — dark mode style element
- `stylebot-color-picker` — color picker class in shadow DOM

## Key Components (v1.1.0 additions)
- **FontFamilyDropdown.vue** — Google Fonts API integration with search input, 3-section layout (Your/System/Google), cached font list
- **GradientPicker.vue** — Visual gradient builder: linear/radial toggle, angle, color stops with sliders, add/remove stops
- **TheCssSelectorDropdown.vue** — Now includes element search panel (search by selector/tag/class/ID/text)
- **TheFooter.vue** — Responsive preview breakpoint buttons (375/768/1024/1440px)
- **Overlay.ts** — Accessibility info: ARIA role, WCAG contrast ratio with pass/fail indicator
- **Highlighter.ts** — Multi-select via Shift+click, tracks `lastSelector`
- **MonacoEditorIframe.ts** — CSS linting (relaxed rules), CSS/SCSS language toggle button
- **FindStyles.vue** — Style auto-update: checks USW API via HEAD, `installedAt`/`uswId` tracking, update button

## Known Issues
- Sass `@import` deprecation warnings (migrating to `@use` is a future task)
- bootstrap-vue-3 has no TypeScript declarations (shimmed in `shims.vue.d.ts`)
- CSS minification warnings from bootstrap-vue-3 unbalanced braces (library issue)
- Google Drive sync merge is style-level only (per-selector conflicts not handled)
- SCSS mode in Monaco is syntax-only (no compilation to CSS)

## Remaining Roadmap
From competitive analysis — items not yet implemented:
- **Additional cloud sync** — OneDrive/Dropbox (requires OAuth setup)
- **Style gallery integration** — USO archive, Greasy Fork alongside USW
- **Element cloning** — duplicate elements for design variant testing
- **Guides & rulers** — alignment and distance measurement
- **AI-powered CSS** — Chrome's Prompt API for natural-language editing
- **DevTools panel** — sidebar panel alongside Elements
- **Full UserCSS format** — `.user.css` with `@var` customizable variables
- **External IDE live reload** — watch filesystem for CSS changes

## Version History
- **v1.1.0** — Feature release: Google Fonts API (1500+), gradient generator, element search, multi-select (Shift+click), responsive preview, accessibility overlay (WCAG contrast), CSS linting in Monaco, SCSS mode toggle, style auto-update, privacy messaging.
- **v1.0.0** — First stable release. Complete rebrand from Stylebot. 9 audit rounds: security hardening, Vue 3 migration, 35+ bug fixes, 25+ UX improvements, 8/8 tests passing, versioned exports, dark mode polish.
