# Research - StyleKit

## Executive Summary
StyleKit is a privacy-first Chrome/Firefox MV3 extension for visual website restyling: Stylebot's point-and-click editor modernized with Vue 3, Vite, Monaco, UserStyles.world search, Google Drive/Gist backup, recipes, readability mode, and accessibility overlays. The strongest current shape is beginner-friendly CSS customization with local-first storage and broad cross-browser ambitions. Highest-value direction: harden the extension and build pipeline first, then close the portability gap with Stylus-class UserCSS semantics, safer storage/sync recovery, narrower web-accessible resources, and better browser-level verification. Top opportunities: clear critical dev dependency advisories, restrict extension storage/resource exposure, validate Monaco postMessage paths, add schema-backed import/sync recovery, add IndexedDB storage migration for large style libraries, improve UserCSS metadata/variables without duplicating existing roadmap items, replace deprecated `bootstrap-vue-3`, add extension E2E load tests, ship reproducible ZIP/CRX packaging checks, and refresh stale Stylebot-facing issue templates.

## Product Map
- Core workflows: inspect an element, edit CSS visually, edit raw CSS in Monaco, install/preview UserStyles.world styles, export/import or sync styles.
- User personas: casual users who want simple labels and instant visual edits; power users who write CSS; privacy-conscious users avoiding analytics; cross-browser users moving between Chrome and Firefox.
- Platforms and distribution: Chrome/Chromium MV3 via `dist/`, Firefox MV3 via `firefox-dist/`, GitHub release ZIP/CRX artifacts, no store automation in repo scripts.
- Key integrations and data flows: `chrome.storage.local` stores styles/options/tokens; content scripts inject saved CSS at `document_start`; background fetches UserStyles.world thumbnails/CSS, Google Drive sync files, GitHub Gists, Google Fonts metadata, and external `@import` CSS.

## Competitive Landscape
- Stylus: mature UserCSS manager with galleries, Dropbox/GDrive/OneDrive/WebDAV sync, auto-update, JSON backup compatibility, CSS/LESS/Stylus linting, and external IDE live reload. Learn its portability/update model; avoid copying its power-user density into the default beginner UI.
- Stylebot: upstream model for simple visual editing, instant saves, readability, grayscale, and Google Drive setup docs. Preserve the low-friction visual workflow; avoid stale branding and old release/manual packaging patterns.
- Dark Reader: best-in-class automatic dark-mode extension with per-site tuning and a large rules ecosystem. Learn from its site-fix strategy; avoid making StyleKit primarily a dark-mode engine when the product is broader CSS editing.
- VisBug: designer-oriented overlay for hover inspection, alignment, a11y, responsive simulation, image/text editing, and page-state tinkering. Borrow production-page design diagnostics; avoid making destructive DOM edits part of StyleKit's saved CSS workflow.
- CSS Scan: commercial CSS inspection/copy tool that handles active CSS, pseudo-elements, media queries, Tailwind conversion, pinned panels, and offline browser-extension operation. Borrow computed CSS capture and copy/export polish; avoid license-gated activation or tracking.
- xStyle: older WebExtensions userstyle manager with cross-browser self-distribution and translation focus. Learn that interoperability matters; avoid reviving dated build/distribution practices.
- CSS-Inject / super-css-inject: small CSS injection tools centered on hosted/local CSS file workflows. Borrow the localhost/live-file editing use case; avoid unbounded remote stylesheet trust.
- Vitesse WebExt: Vue 3 + Vite WebExtension template with HMR, typed manifest, webext-bridge, and web-ext reload workflow. Borrow dev-experience patterns; avoid broad framework churn unless tied to concrete maintenance wins.

## Security, Privacy, and Reliability
- Verified: `npm audit --json` reports 47 dev dependency vulnerabilities, including critical chains through `vitest@1.4.0`, `web-ext@7.11.0`, and vulnerable Vite/esbuild paths; `npm audit --omit=dev` is clean, so user runtime risk is low but the local build/test surface is stale.
- Verified: `src/extension/manifest.json` exposes `chunks/*`, `monaco-editor/*`, iframe assets, and content CSS/JS to `<all_urls>` without `use_dynamic_url`; Chrome and MDN document web-accessible resources as fingerprinting and misuse surface.
- Verified: `src/editor/components/TheCodeEditor.vue`, `src/options/components/styles/CodeEditor.vue`, and `src/monaco-editor/iframe/MonacoEditorIframe.ts` listen for `message` events without checking `origin` and `source`, even though they send to `chrome.runtime.getURL('/')`.
- Verified: `chrome.storage.local` holds styles plus `gistToken` in `src/options/components/sync/TheGistBackup.vue`; Chrome exposes `storage.local` to content scripts by default unless access is restricted, while StyleKit content scripts currently use storage directly in a few components.
- Verified: `src/sync/google-drive/merge-styles.ts` has last-writer-wins merge only and retains deletes because deletion timestamps are not recorded; this can resurrect removed styles after sync.
- Verified: `src/options/components/styles/StyleImportFromUrl.vue` fetches arbitrary user-provided URLs directly from an extension page and accepts `text/html`; background import expansion is stricter for `@import` but no shared validation pipeline exists.
- Verified: `src/extension/manifest.json` grants broad permissions (`tabs`, `activeTab`, `scripting`, `identity`, `unlimitedStorage`) and external hosts; the product should keep a permission audit tied to each workflow before store publication.

## Architecture Assessment
- `src/background/styles.ts`, `src/background/style-index.ts`, and `src/inject-css/index.ts` are the right boundary for style lookup and injection; next work should keep content scripts thin and push privileged fetching/storage decisions through background messages.
- `src/utils/usercss.ts` strips metadata and unwraps `@-moz-document`, but it does not preserve metadata, variables, update URLs, preprocessor mode, or all match scopes; existing roadmap already calls for full UserCSS, so implementation should start with parser/storage schema rather than UI.
- `src/sync/google-drive/*` and `src/options/components/sync/TheGistBackup.vue` need a shared backup schema, migration version, dry-run import report, validation, tombstones, and rollback snapshot before more sync providers are added.
- `src/extension/manifest*.json` and `vite.config.ts` should gain a manifest/resource audit test so future Monaco chunks and web-accessible resources stay intentional.
- Test coverage is narrow: eight Vitest files cover CSS utilities, URL matching, and store mutations/actions, but not extension loading, manifest validity, popup/options flows, Monaco messaging, sync conflict handling, or import/export recovery.
- Distribution is manual: `package.json` has build scripts but no reproducible ZIP/CRX packaging or artifact verification script; root release artifacts exist, but packaging hygiene should be scripted before more releases.
- Documentation gap: `.github/ISSUE_TEMPLATE/*.md` still says Stylebot; README claims 15+ translations and many workflows but no support matrix for which features work in Firefox, unpacked Chrome, or local dev OAuth.

## Rejected Ideas
- Anti-paywall reader features from the existing roadmap: reject for now because they create legal/support risk and do not reinforce the core CSS editing product.
- Team spaces / CRDT collaboration from the existing roadmap: defer until local storage schema, tombstones, and single-user sync recovery are reliable.
- Dark Reader engine vendoring: reject for now because Dark Reader is a full product with its own rules ecosystem; StyleKit should coordinate/avoid conflicts before absorbing an engine.
- Chrome Prompt API natural-language editing: reject for now because the product's privacy promise and local-first editing are clearer with deterministic CSS tools.
- Browser store CI/CD automation: reject because repo instructions require local builds and GitHub-only hosting, not CI workflows.

## Sources
### Direct OSS
- https://github.com/openstyles/stylus
- https://github.com/openstyles/stylus/wiki/UserCSS
- https://github.com/ankit/stylebot
- https://github.com/darkreader/darkreader
- https://github.com/FirefoxBar/xStyle
- https://github.com/sym3tri/CSS-Inject
- https://github.com/nelsonr/super-css-inject
- https://greasyfork.org/en/help/installing-user-styles

### Commercial / Adjacent
- https://getcssscan.com/
- https://github.com/GoogleChromeLabs/ProjectVisBug
- https://github.com/violentmonkey/violentmonkey
- https://github.com/antfu-collective/vitesse-webext

### Platform / Standards
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/reference/api/storage
- https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources
- https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/web_accessible_resources

### Dependency / Security
- https://github.com/advisories/GHSA-5xrq-8626-4rwp
- https://github.com/advisories/GHSA-fx2h-pf6j-xcff
- https://github.com/advisories/GHSA-3p6v-hrg8-8qj7
- https://www.npmjs.com/package/bootstrap-vue-3
- https://www.npmjs.com/package/bootstrap-vue-next
- https://www.npmjs.com/package/vite
- https://www.npmjs.com/package/vitest
- https://www.npmjs.com/package/web-ext
- https://www.npmjs.com/package/monaco-editor
- https://www.npmjs.com/package/@mozilla/readability

## Open Questions
- Which Chrome Web Store / AMO publication path is intended for StyleKit, or is GitHub self-distribution the only supported channel?
- Should Gist backup tokens remain stored in extension storage, or should Gist be replaced by a browser identity/OAuth flow before wider release?
