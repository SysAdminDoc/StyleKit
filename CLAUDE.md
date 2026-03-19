# CLAUDE.md - StyleKit

## Project Overview
StyleKit is a Chrome/Firefox browser extension (Manifest V3) that lets users customize any website's appearance. Forked from Stylebot, rebranded and enhanced. v1.0.0.

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
- 8/8 test suites pass (76/76 tests)
- Sass `@import` deprecation warnings (migrating to `@use` is a future task)
- bootstrap-vue-3 has no TypeScript declarations (shimmed in `shims.vue.d.ts`)
- CSS minification warnings from bootstrap-vue-3 unbalanced braces (library issue)
- Google Drive sync merge is style-level only (per-selector conflicts not handled)

## Roadmap (Post-v1.0.0)
Competitive analysis against Stylus, VisBug, Amino, Visual CSS Editor, and VibeCSS identified these improvements:

### High Priority
1. **Google Fonts API integration** — fetch full font list (~1500 fonts) instead of hardcoded 14; cache in storage.session
2. **CSS linting in Monaco** — integrate Stylelint to highlight errors/warnings as user types in code editor
3. **Multi-select elements** — hold Shift during inspect to select multiple elements; apply styles to all at once
4. **Style auto-update** — styles installed from UserStyles.world check for updates periodically and offer one-click update
5. **Element search** — text input in editor header to find elements by CSS selector, tag name, or text content
6. **Gradient generator** — visual linear/radial gradient builder in the Colors section
7. **Responsive preview** — viewport width switcher (320/768/1024/1440) to test styles at different breakpoints
8. **Privacy messaging** — add "No analytics, no tracking" badge prominently in README and store listing

### Medium Priority
9. **Additional cloud sync** — OneDrive and Dropbox alongside Google Drive
10. **SCSS support** in Monaco code editor (compile to CSS on save)
11. **Style gallery integration** — support USO archive and Greasy Fork alongside UserStyles.world
12. **Element cloning** — duplicate elements for quick design variant testing (inspired by VisBug)
13. **Guides & rulers** — alignment guides and distance measurement between elements
14. **Accessibility inspection** — show WCAG contrast ratio, ARIA roles on hover during inspect

### Aspirational
15. **AI-powered CSS suggestions** — Chrome's Prompt API (stable in Chrome 138+) for natural-language CSS editing
16. **DevTools panel** — integrate as a Chrome DevTools sidebar panel (alongside Elements)
17. **Full UserCSS format** — support `.user.css` with `@var` customizable variables
18. **External IDE live reload** — watch filesystem for CSS changes and hot-reload

## Architecture Notes for Feature Implementation
- **Font picker**: `src/editor/components/text/FontFamilyDropdown.vue` + `src/editor/components/text/FontFamily.vue`. Hardcoded `systemFonts` array in dropdown. Replace with API fetch + cache.
- **Monaco editor**: `src/monaco-editor/iframe/MonacoEditorIframe.ts`. Linting would need a worker or iframe-side validation. Monaco supports `registerCompletionItemProvider` for custom autocomplete.
- **Inspector/highlighter**: `src/highlighter/Highlighter.ts` + `src/highlighter/Overlay.ts`. Multi-select would need array of targets instead of single target. Overlay already supports multi-element display (capped at 100).
- **Style auto-update**: Background service worker already has preloader infrastructure (`src/background/preloader.ts`). Add periodic alarm to check USW API for version bumps.
- **Gradient builder**: New component in `src/editor/components/color/`. Would dispatch `applyDeclaration` with `background-image` property.
- **Responsive preview**: Would use `chrome.debugger` API or inject viewport meta tag + iframe wrapper.

## Version History
- **v1.0.0** — First stable release. Complete rebrand from Stylebot. 9 audit rounds: security hardening, Vue 3 migration, 35+ bug fixes, 25+ UX improvements, 8/8 tests passing, versioned exports, dark mode polish, Escape key fix, dead code removal.
