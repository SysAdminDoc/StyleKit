# ROADMAP

StyleKit (this repo) is the modernized Stylebot fork: Vue 3 + Vuex 4 + TypeScript + Vite 5, Catppuccin Mocha dark theme, plain-English labels, Monaco editor, visual gradient/box-model/a11y tooling, UserStyles.world search, Google Drive + Gist sync, Readability mode. Chrome MV3 and Firefox.

## Planned Features

### Editor
- Selector playground: edit the selector inline with live match-count in the header, highlight changes on the page in real time
- Scoped rule groups (`@scope`) with UI support — today advanced CSS needs raw mode
- Container-query builder next to the responsive-preview buttons
- Color picker: add OKLCH/OKLab output and WCAG AA/AAA contrast lock ("raise lightness until contrast >= 4.5")
- Code folding and minimap in the Monaco iframe

### Recipes and community
- One-click publish of a recipe to a user's Gist (with URL pattern and metadata)
- Recipe Registry — a curated index JSON in a separate repo, PR'd recipes verified on CI
- Per-recipe popularity and "last verified" date so stale recipes surface to the top of a cleanup queue
- Recipe diff view when UserStyles.world has an update available

### Sync
- CRDT-based merge when two devices edit the same site's styles offline
- E2EE option for Drive/Gist sync (libsodium-wrappers, user-held key)
- Conflict resolution UI on sync, not silent last-write-wins
- Per-site sync toggle — keep some rules local-only (e.g., work intranet styles)

### Platform
- Firefox Android build with the content-script Shadow DOM path
- Safari Web Extension port (convert-ext from the Firefox build)
- Background service worker: audit for idle-time leaks with `chrome.alarms` + persistence tests
- Replace bootstrap-vue-3 (low maintenance velocity) with a small internal component set or PrimeVue

### Privacy / security
- SRI hash validation for Google Fonts loads
- Block third-party `@import` in user CSS by default, opt-in per rule
- CSP-compatible mode for sites that enforce strict CSP (fall back to `registerContentScripts` injection)

## Competitive Research

- **Stylus (openstyles/stylus)** — The power-user standard; matches StyleKit on features but loses on onboarding. Parity watch for UserCSS + @-moz-document, live-reload workflow
- **Stylish** — Commercial, analytics-ridden; StyleKit's anti-pattern reference
- **Dark Reader** — Dynamic dark-mode generation; StyleKit's generated-dark-mode quality should meet theirs
- **Amino / Cascade (legacy)** — Visual-editor-first approach; inspiration for deeper point-and-click features

## Nice-to-Haves

- AI-assisted "make this page look like [screenshot]" — upload a reference, get a CSS draft (local model first, API key fallback)
- Multi-profile (Work / Personal / Presenting) with global hot-swap
- Screenshot-to-CSS for palettes (pick a page photo, extract 5 dominant colors)
- Rule linter that flags selectors likely to break on next-page update (relies on unstable class name heuristics)
- MCP server so external tools (editor extensions) can read/write the style library

## Open-Source Research (Round 2)

### Related OSS Projects
- https://github.com/openstyles/stylus — Stylus, the leading OSS userstyles manager; cloud sync (Dropbox/GDrive/OneDrive/WebDAV), UserCSS support, live-reload, Stylelint+CSSLint-mod linting, ~10kB content script
- https://github.com/ankit/stylebot — upstream Stylebot (our fork origin); reference for visual-picker UX patterns
- https://github.com/darkreader/darkreader — Dark Reader; canonical OSS "adaptive dark theme everywhere" extension; great reference for content-script perf and CSS inversion logic
- https://github.com/xthezealot/xstyle — xStyle, an established Stylish-era userstyles manager
- https://github.com/topics/userstyles — topic hub for the adjacent ecosystem
- https://userstyles.world/ — USW gallery (the open successor to userstyles.org); API is public and free to integrate
- https://uso.kkx.one/ — USO archive mirror; still the largest corpus of historical userstyles

### Features to Borrow
- Cloud sync for Dropbox / Google Drive / OneDrive / WebDAV (Stylus) — we already have Drive + Gist on the roadmap; extend to WebDAV for self-hosters (Nextcloud, etc.)
- UserCSS installable from any plain-text URL (Stylus) — our Monaco editor plus a simple URL-import action unlocks the entire USW/USO ecosystem without building a catalog browser
- Live-reload against an external editor (Stylus) — advanced users write SASS/SCSS in their IDE; StyleKit watches the compiled CSS file and hot-reloads, no extension reload needed
- Stylelint + CSSLint-mod integration (Stylus) — our Monaco editor already handles syntax; add linting with inline diagnostics to match Stylus parity
- JSON backup compatible with Stylus and xStyle (Stylus) — bidirectional import/export so users can migrate between StyleKit and Stylus without losing styles
- Lightweight content-script target (~10kB, ~1ms) (Stylus) — benchmark our current CS against that budget; we likely have room to tighten
- Dark Reader adaptive-inversion heuristics (Dark Reader) — optional "auto dark mode any site" module that activates only on sites without a Stylebot style, complements user-authored styles rather than replacing them

### Patterns & Architectures Worth Studying
- UserCSS spec + `@-moz-document` domain scoping — industry-standard distribution format; make StyleKit a first-class author and consumer, not just a consumer
- Content-script injection timing + size discipline (Stylus) — injection at `document_start` with minimal JS, styles as CSS strings for fastest paint; perf budget should be a shipped metric, not folklore
- MV3 service-worker state persistence — Stylus is still shipping MV2 on Chromium because of MV3 pain; StyleKit already on MV3 is a differentiator. Document the patterns (chrome.storage for hot state, alarms for wake-ups, no long-lived globals) that make it work
- Sync backend abstraction — Stylus's multi-cloud pluggability is achieved via a clean `SyncProvider` interface. Abstract our Drive + Gist today so WebDAV / OneDrive / Dropbox are drop-ins tomorrow
