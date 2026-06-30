# StyleKit Roadmap

Roadmap for StyleKit, the modernized Stylebot fork: Vue 3 + Vuex 4 + Vite 8 + Monaco, Chrome + Firefox MV3, Google Drive / Gist sync, UserStyles.world browser.

## Planned Features

### Visual editor
- Multi-selector selection (shift-click) and selector simplification
- Gradient editor upgrade: conic gradients, multi-angle controls, copy-as CSS
- Per-element animation editor (keyframes panel with visual keyframe markers)
- Grid/flex overlay to visualize the target's layout context
- Font weight + variable-font axes picker for variable-font-enabled sites

### Code editor
- Persistent Monaco themes matching the three StyleKit UI themes
- CSS lint rule presets (strict, relaxed, "stylelint-config-standard") with per-site override
- Prettier-on-save toggle
- Minify-on-export toggle
- Diff view against previous saved version (not just the session start)

### Recipes & snippets
- User-created recipes alongside built-ins, shareable via JSON export
- Recipe marketplace fed from GitHub-hosted public recipe repos (with version pins)
- Per-site suggested recipes based on domain ("You're on YouTube - try YouTube Clean Feed")
- Snippet library with preview of what each snippet changes

### Sync & collaboration
- CRDT-based collaborative editing (Yjs) for shared style packs between team members
- Team spaces - share a set of styles across multiple authors with role-based permissions
- WebDAV / S3 sync in addition to Google Drive and Gist
- Selective sync (only sync certain styles/folders)

### Readability mode
- Reading list with read-later queue, offline caching, and cross-device sync
- TTS + reading speed controls
- Word-count and estimated-reading-time per article
- Anti-paywall support for personally-subscribed sites (user provides cookie)

### Dark mode generator
- Improved auto-dark generator with deep learning-free rule engine (Dark Reader-style static analysis)
- Per-site dark-mode palette overrides
- "Don't invert these elements" blacklist (images, videos, code blocks) with one-click picker
- Dark-mode vs system-preference coordination

### Accessibility
- Contrast-fixer that auto-corrects failing WCAG AA pairs
- High-contrast mode preset
- Reduce-motion style bundle
- Color-blind-safe palette transforms (deutan, protan, tritan)

## Competitive Research

- **Stylus** - canonical; StyleKit already provides Stylus import. Add Stylus export for roundtrip.
- **StyleCraft (sibling repo)** - power-user counterpart; cross-link clearly, sync users in both directions via the same JSON schema.
- **Dark Reader** - industry-standard dark-mode. Instead of reinventing, consider a "Use Dark Reader engine" toggle that delegates when the extension is present, or vendor their rule-engine under MIT.
- **Arc Boosts** - Arc's native per-site CSS/JS. StyleKit advantage is cross-browser; copy Arc's one-click "Zap" UX for element-hide.
- **Stylebot** (upstream) - track their maintenance; merge security patches and API updates when upstream is active.

## Nice-to-Haves

- Style-pack marketplace inside the popup (curated, reviewed)
- "Style this site like" picker - clone the palette/typography/rhythm from any reference site to the current one
- Per-device overrides (home PC vs work laptop get different variants of the same pack)
- Optional AI assist (local Ollama or user-key OpenAI) for recipe generation
- One-click publish to UserStyles.world with metadata prefilled
- Recording mode - record edits as a macro, share macro URLs for quick reinstall on another machine
- Import from Arc Boosts JSON export when users migrate off Arc

## Open-Source Research (Round 2)

### Related OSS Projects
- https://github.com/openstyles/stylus — Largest userstyles ecosystem; preprocessor, cloud sync, linters, user-CSS metadata
- https://github.com/ankit/stylebot — Upstream of StyleKit (already acknowledged); structural reference for element picker
- https://github.com/darkreader/darkreader — Dynamic dark-mode engine (color-scheme inversion, per-site overrides)
- https://github.com/xcss/xStyle — Fork of Stylish-for-Chrome 1.7.0, lightweight alt
- https://github.com/violentmonkey/violentmonkey — Userscripts ecosystem, good MV3 pattern to mirror
- https://userstyles.world — Modern UserCSS host, import target for Galleries tab
- https://addons.mozilla.org/en-US/firefox/addon/styl-us/ — Firefox Stylus build, for cross-browser parity
- https://github.com/topics/stylish — Stylish-themed style collections

### Features to Borrow
- UserCSS `.user.css` single-file format with `@updateURL` auto-update (Stylus)
- Less/Stylus/SCSS preprocessing at save time (Stylus)
- Dark Reader coordination — dispatch event so DR can skip pages where StyleKit already provides a theme (Dark Reader ecosystem)
- Cloud-sync adapters (Dropbox / GDrive / OneDrive / WebDAV) with encrypted JSON blob (Stylus)
- Stylelint in-editor warnings (Stylus) — StyleKit's "plain-English" labels are end-user friendly, add an advanced-editor mode that lints
- Install-from-URL dialog with preview + metadata table (name, namespace, version, matches) (Stylus)
- UserStyles.world gallery browser + one-click install (userstyles.world)
- Import from Stylus/Stylebot JSON for easy migration in (Stylus's Stylish-compatible backup format)

### Patterns & Architectures Worth Studying
- Dual-mode storage: plain-English "recipes" (current) map 1:1 to UserCSS text under the hood, export preserves raw UserCSS (best of both — beginner UX + portability)
- MV3 `declarativeNetRequest` for simple `@match` rules, content-script fallback for complex selectors — perf win Stylebot/Stylus don't fully exploit
- Per-site "pack" composition — multiple UserCSS blocks stack with deterministic order, visual indicator when rules conflict (Stylus lacks; differentiator)
- Sandbox preview iframe for "try before apply" at the option page (Stylus advanced feature)
- Violentmonkey-style sync protocol buffer so StyleKit-Scripts (if ever added) shares the same transport

## Implementation Deep Dive (Round 3)

### Reference Implementations to Study
- **openstyles/stylus / src/background/style-manager.js** — https://github.com/openstyles/stylus — canonical CSS injection manager: handles `@-moz-document` scopes, regex/prefix/url-prefix matching, live preview, and MV3 DNR integration.
- **openstyles/stylus / src/edit/** — editor UX patterns (CodeMirror) — even if we stay on Monaco, study the preview/apply/revert flow and the scope validation UX.
- **openstyles/stylus / src/inject/** — injection timing: `chrome.scripting.insertCSS` at `document_start` + `origin:"USER"` to beat site styles. https://github.com/openstyles/stylus/tree/master/src/inject
- **sym3tri/CSS-Inject** — https://github.com/sym3tri/CSS-Inject — minimal reference; good for understanding the simplest path before Stylus-class features.
- **nelsonr/super-css-inject** — https://github.com/nelsonr/super-css-inject — cross-browser CSS injector supporting Firefox and Chrome.
- **vitejs/vite-plugin-chrome-extension** — https://github.com/crxjs/chrome-extension-tools — HMR for Vue 3 + MV3; critical for our Vuex-driven popup dev loop.
- **create-chrome-ext + vitesse-webext** — https://github.com/antfu/vitesse-webext — production Vue 3 + MV3 template; informs our Vite config and component organization.

### Known Pitfalls from Similar Projects
- **Manifest-declared CSS loses the cascade** — Chrome doesn't put `content_scripts.css` at the end of the style list; overrides silently lose. Use `chrome.scripting.insertCSS({ origin:"USER" })` at runtime. Reference: https://github.com/openstyles/stylus/discussions/1179
- **iframe scope leakage** — Stylus-style `@-moz-document` in Chromium requires per-frame scope inspection; injecting into `all_frames:true` without URL checking styles ad iframes accidentally.
- **Shadow DOM invisibility** — styles don't cross shadow roots; for sites using web components, `chrome.scripting.executeScript` in `world:"MAIN"` must `attachShadow`-iterate and inject `<style>` into each root.
- **Vuex persistence + MV3 SW** — SW resets lose Vuex state; hydrate from `chrome.storage.local` on every popup open, don't trust in-memory. See: https://github.com/antfu/vitesse-webext
- **DNR-based stylesheet blocking** — blocking-a-stylesheet via `declarativeNetRequest` then injecting ours is racy; the old stylesheet may already be in the CSSOM. Inject `all { all: unset }` reset inside our namespace instead.
- **User-style schema lock-in** — USO format is de-facto standard; emit + consume USO-compatible metadata headers so users can import from Stylus/UserStyles.world. See: https://github.com/openstyles/stylus/wiki

### Library Integration Checklist
- **Vue 3** pin `>=3.4`; entrypoint `createApp`; gotcha: `<script setup>` requires `@vitejs/plugin-vue` — MV3 content scripts must be pre-built (no runtime template compiler).
- **Vuex 4** pin `>=4.1`; entrypoint `createStore`; gotcha: persist via `chrome.storage.local`, not `localStorage` (not available in SW).
- **Vite 5** pin `>=5.x`; entrypoint `vite build`; gotcha: set `build.target:"chrome109"` to keep MV3 minimum; emit separate entries for popup/options/content/SW.
- **@crxjs/vite-plugin** pin `>=2.0 beta`; entrypoint `crx({ manifest })`; gotcha: v1 is EOL; v2 only works with Vite 5.
- **monaco-editor** (if adopted) pin `>=0.48`; gotcha: see ScriptVault notes — workers must bundle.
- **chrome.scripting** MV3 API; entrypoint `insertCSS`/`removeCSS`; gotcha: `origin:"USER"` wins the cascade but persists across tab reloads only if re-registered.
- **idb** pin `>=8.x` (user-style storage >5MB); gotcha: SW reopens DB per op.

## Research-Driven Additions

- [ ] P2 - Replace deprecated Bootstrap Vue package
  Why: `bootstrap-vue-3@0.5.1` is deprecated and points users to `bootstrap-vue-next`, while StyleKit already carries declaration shims for missing package types.
  Evidence: `package.json`; `shims.vue.d.ts`; npm metadata for `bootstrap-vue-3` and `bootstrap-vue-next`
  Touches: Vue components using Bootstrap Vue controls, package manifests, shims, styles, tests
  Acceptance: Deprecated package and shims are removed, equivalent components render in popup/options/editor, and lint/tests/builds pass for Chrome and Firefox.
  Complexity: L

- [ ] P2 - Add browser extension E2E smoke tests
  Why: Current tests cover utilities and store behavior but not manifest loading, popup/options rendering, content-script injection, Monaco messaging, or Firefox build output.
  Evidence: `src/**/__tests__`; `package.json`; `vite.config.ts`; Stylebot/Chrome extension workflows
  Touches: test tooling, built extension fixtures, popup/options/editor smoke specs, package scripts
  Acceptance: A local command builds the extension, loads it in a clean browser profile, opens popup/options, injects a test style on a fixture page, verifies CSS application, and runs without GitHub Actions.
  Complexity: L

- [ ] P2 - Script reproducible ZIP and CRX artifact verification
  Why: Releases currently rely on manual root ZIP/CRX artifacts, while MV3 self-distribution needs ZIP-first guidance and CRX verification to avoid stale or malformed assets.
  Evidence: root `StyleKit-v1.0.0-*` and `StyleKit-v1.1.0-*` artifacts; `package.json`; Chrome extension packaging memory
  Touches: package scripts, release tooling, README release commands, artifact verification script
  Acceptance: One local command cleans old artifacts, builds Chrome and Firefox outputs, creates POSIX-path ZIPs, signs/verifies CRX when key exists, and prints asset names matching the current package version.
  Complexity: M

- [ ] P2 - Add diagnostics log export
  Why: Sync, import, UserStyles.world, Google Fonts, and message failures currently surface as warnings/status strings without a consolidated support log.
  Evidence: `src/background/preloader.ts`; `src/background/styles.ts`; `src/options/components/sync/TheGistBackup.vue`; `src/popup/components/FindStyles.vue`
  Touches: background logger, options diagnostics panel, sync/import/font fetch call sites, tests
  Acceptance: Users can export a redacted JSON diagnostic bundle with extension version, browser, enabled permissions, recent sync/import errors, and storage usage without including CSS contents or tokens.
  Complexity: M

- [ ] P2 - Refresh public issue templates
  Why: Bug and feature templates still ask users to report Stylebot issues, which weakens project identity and triage quality.
  Evidence: `.github/ISSUE_TEMPLATE/bug_report.md`; `.github/ISSUE_TEMPLATE/feature_request.md`
  Touches: `.github/ISSUE_TEMPLATE/bug_report.md`, `.github/ISSUE_TEMPLATE/feature_request.md`
  Acceptance: Templates consistently say StyleKit, request browser/version/distribution channel, include privacy-safe diagnostics guidance, and avoid obsolete Stylebot wording.
  Complexity: S

- [ ] P3 - Add locale completeness checks
  Why: README claims 15+ translations, but locale files are hand-maintained `.config` files with no automated missing-key or stale-string check.
  Evidence: `src/_locales/*.config`; `vite.config.ts` locale transform; Stylebot translation workflow
  Touches: locale transform plugin, test script, locale files, README support matrix
  Acceptance: A local check compares every locale against `en.config`, reports missing/extra keys, and fails on malformed placeholder syntax before build.
  Complexity: S

## Research-Driven Additions

- [ ] P1 - Move saved-style application to USER-origin CSS insertion
  Why: StyleKit currently appends DOM `<style>` tags and blanket `!important` rules, while MV3 supports browser-managed CSS insertion with `origin: 'USER'` for stronger cascade behavior.
  Evidence: `src/inject-css/index.ts`; `src/editor/listeners/common.ts`; `src/css/inject-style.ts`; `src/background/styles.ts`; Chrome `scripting.insertCSS` docs; Stylus injection architecture
  Touches: background style application, content-script injection fallback, preview/remove paths, manifest permissions, style removal tests
  Acceptance: Saved styles and previews use `chrome.scripting.insertCSS/removeCSS` with USER origin where supported, fall back to DOM style injection only when necessary, remove applied CSS reliably, and no longer require blanket `!important` for normal cascade wins.
  Complexity: L

- [ ] P1 - Add frame-aware style matching and injection guards
  Why: `inject-css/index.js` runs in `all_frames`, and iframe URL matching needs explicit tests to avoid styling unrelated ad/sandbox frames or missing `about:blank`/`srcdoc` cases.
  Evidence: `src/extension/manifest.json`; `src/inject-css/index.ts`; `src/background/utils.ts`; `src/background/style-index.ts`; Chrome content-script frame docs; Stylus iframe/CSP issue history
  Touches: style matcher, injection messages, frame targeting, tests, popup/editor apply status
  Acceptance: Tests cover top frame, matching iframe, non-matching iframe, `about:blank`, and `srcdoc`; non-matching frames receive no saved CSS; matching child frames receive the correct style set with observable debug/status evidence.
  Complexity: M

- [ ] P1 - Add UserStyles.world provider health and degraded-state cache
  Why: StyleKit's popup depends on UserStyles.world, and upstream issues show API/CORS/outage failures that currently collapse into generic error states.
  Evidence: `src/popup/components/FindStyles.vue`; `src/background/preloader.ts`; userstyles-world issues #385/#386/#377
  Touches: popup search/install/update flow, background preloader, thumbnail/result cache, diagnostics export, locale strings
  Acceptance: Search shows clear provider status, cached last-good results remain available when the provider fails, retries use backoff, install/update failures never corrupt installed styles, and diagnostics identify provider errors without leaking CSS or tokens.
  Complexity: M

- [ ] P2 - Add opt-in shadow-root styling support
  Why: Document-level style tags do not cross site shadow roots, so styles can silently miss modern web components even when the top-page URL matches.
  Evidence: `src/css/inject-style.ts`; `src/inject-css/index.ts`; web.dev constructable stylesheet guidance; VisBug/shadow-DOM inspection precedent
  Touches: style schema/options, injection runtime, MutationObserver cleanup, tests, UI copy for unsupported closed roots
  Acceptance: A per-style option applies CSS to open shadow roots via `adoptedStyleSheets` or scoped `<style>` fallback, watches newly attached open roots, cleans up on disable/delete, and reports closed roots as unsupported rather than claiming full coverage.
  Complexity: L

- [ ] P2 - Add extension UI accessibility regression coverage
  Why: Popup, editor, options, onboarding, toasts, and destructive controls use many custom/title-only controls without rendered focus/name/announcement tests.
  Evidence: `src/popup/components/FindStyles.vue`; `src/popup/components/Style.vue`; `src/editor/components/header/*`; `src/editor/components/TheFooter.vue`; `src/options/components/*`; current 11 Vitest suites
  Touches: component markup, i18n labels, modal/toast behavior, test tooling, browser smoke fixtures
  Acceptance: Local tests or browser smokes verify accessible names for icon buttons, focus handling for modals/onboarding/delete flows, keyboard reachability without page-shortcut leakage, reduced-motion-safe animations, and status/toast announcements.
  Complexity: M

- [ ] P2 - Add manual dependency upgrade and compatibility ratchet
  Why: `npm outdated` shows major drift in TypeScript, ESLint, typescript-eslint, Monaco, cross-env, lint-staged, and related tooling while dependency bots are intentionally prohibited.
  Evidence: `package.json`; `package-lock.json`; `npm outdated`; repo no-Dependabot/no-Actions policy
  Touches: package scripts, local dependency-check script, README/CLAUDE command notes, upgrade verification notes
  Acceptance: A local command reports current/wanted/latest versions, groups safe patch/minor vs major upgrade batches, prints required local verification commands, and does not create Dependabot/Renovate/GitHub Actions config.
  Complexity: S

- [ ] P2 - Migrate project Sass imports to module syntax
  Why: Sass has deprecated `@import`, and StyleKit's project SCSS still uses `@import` in popup/options/editor/readability styles.
  Evidence: `src/editor/index.scss`; `src/options/App.vue`; `src/popup/App.vue`; `src/readability/index.scss`; Sass `@import` deprecation notice
  Touches: project SCSS entry points, shared palette/theme modules, build warnings, visual smoke checks
  Acceptance: Project-owned SCSS uses `@use`/`@forward` or CSS imports where appropriate, build output is visually unchanged, and remaining Sass warnings are either zero or limited to third-party packages with documented blockers.
  Complexity: M

- [ ] P3 - Add explicit local-source live-reload style mode
  Why: Power users and adjacent CSS-injection tools value editing in an external editor, but StyleKit currently imports URL CSS as a one-time copy with no safe live source contract.
  Evidence: `src/options/components/styles/StyleImportFromUrl.vue`; Stylus external-editing ecosystem; CSS-Inject/super-css-inject local CSS workflows
  Touches: style schema, options import UI, background fetch/reload loop, permission prompts, rollback snapshots, diagnostics
  Acceptance: Users can opt a style into a trusted localhost/file/source URL, see reload status and last fetch errors, manually snapshot/rollback before overwrites, and disable the source without losing the last saved CSS.
  Complexity: L
