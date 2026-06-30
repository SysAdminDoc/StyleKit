# Research - StyleKit

## Executive Summary
StyleKit is a local-first Chrome/Firefox WebExtension for visual website restyling: it combines Stylebot-style point-and-click editing, Monaco code editing, UserStyles.world discovery, Google Drive/Gist backup, rollback snapshots, readability mode, and beginner-friendly copy. Its strongest current shape is fast casual CSS customization with a privacy promise and a modern Vue/Vite MV3 stack. The highest-value direction is to keep hardening privileged extension boundaries and style application semantics before adding more marketplace or collaboration features. Priority opportunities: minimize web-accessible resources, move saved CSS toward `chrome.scripting.insertCSS({ origin: 'USER' })`, add frame/shadow-root injection coverage, make UserStyles.world outages recoverable, preserve full UserCSS metadata/variables, add schema/tombstone sync recovery, script packaging/E2E checks, replace deprecated UI dependencies, and add manual dependency/Sass/a11y ratchets.

## Product Map
- Core workflows: inspect/select page elements, edit CSS visually, edit raw CSS in Monaco, preview/install UserStyles.world styles, import/export or sync styles, restore the last bulk-change rollback snapshot.
- User personas: casual users who want plain-English style controls; power users who write CSS/UserCSS; privacy-conscious users avoiding telemetry; cross-browser users moving styles between Chrome and Firefox.
- Platforms and distribution: Chrome/Chromium MV3 from `dist/`, Firefox MV3 from `firefox-dist/`, GitHub release ZIP/CRX artifacts, local-only build/test/release workflow.
- Key integrations and data flows: `chrome.storage.local` stores styles/options/Gist token/cache data; content scripts inject saved CSS at `document_start`; background/popup code fetches UserStyles.world, Google Drive, GitHub Gist, Google Fonts, thumbnails, and imported CSS.

## Competitive Landscape
- Stylus: mature UserCSS manager with metadata, variables, update URLs, preprocessors, backups, cloud sync, editor tooling, and frequent releases. Learn its portability/sync model; avoid forcing its dense power-user UI into StyleKit's default visual editor.
- Stylebot: original low-friction visual CSS editor and the lineage for StyleKit's selector/editor model. Preserve instant editing and simple mental models; avoid stale branding, manual release drift, and old extension assumptions.
- Dark Reader: strongest automatic dark-mode ecosystem with per-site fixes, browser-specific bug triage, and performance pressure from complex sites. Learn from its site-fix/degraded-behavior discipline; avoid turning StyleKit into a dark-mode engine clone.
- UserStyles.world / Greasy Fork: primary style-gallery ecosystem and UserCSS install path. Keep compatibility and graceful fallback; avoid making StyleKit dependent on one upstream API being healthy.
- CSS Scan / VisBug: polished inspection, computed-style capture, pseudo-state/media-query visibility, alignment/a11y overlays, and designer-grade production-page diagnostics. Borrow focused inspection/export polish; avoid paid activation, telemetry, or destructive DOM editing as a saved workflow.
- CSS-Inject / super-css-inject: small tools centered on hosted/local CSS injection. Borrow explicit local-source/live-reload workflows; avoid unbounded remote CSS trust and silent overwrites.
- Vitesse WebExt / CRXJS: Vue/Vite WebExtension dev-experience references with typed manifests, reload/HMR patterns, and browser smoke loops. Borrow manifest/test/build ergonomics only where they reduce maintenance risk.
- Cascadea / Arc Boosts: commercial/native CSS customization shows users value per-site customization with sync and simple controls. Learn onboarding and per-site packaging; avoid JS boosts and browser-specific lock-in for this cross-browser CSS product.

## Security, Privacy, and Reliability
- Verified: `npm audit --json` is clean on 2026-06-29; the prior `RESEARCH.md` vulnerability claim is stale and should not guide new work.
- Verified resolved in v1.1.4: package/README/source manifest versions, README install text, changelog date, and test counts now align with 12 suites/85 tests.
- Verified resolved in v1.1.4: `src/background/index.ts` restricts `chrome.storage.local` to trusted contexts, and editor onboarding/Google Fonts cache now route through typed background messages instead of direct content-script `storage.local` calls.
- Verified: `src/extension/manifest.json` exposes `chunks/*`, broad Monaco paths, editor CSS, and readability assets to `<all_urls>` without `use_dynamic_url`; this matches the existing web-accessible-resource hardening item.
- Verified: saved style application still uses DOM `<style>` injection through `src/inject-css/index.ts`, `src/editor/listeners/common.ts`, and `src/css/inject-style.ts`, plus blanket `!important` generation in `src/background/styles.ts`; this is less precise than USER-origin CSS insertion where browser support exists.
- Verified: `src/extension/manifest.json` runs `inject-css/index.js` in `all_frames`; `src/sync/google-drive/merge-styles.ts` documents delete resurrection risk; `src/options/components/styles/StyleImportFromUrl.vue` accepts `text/html` for URL-import preview; existing roadmap items already cover import schema and sync tombstones.
- Verified: UserStyles.world issue traffic shows API/CORS/outage risk, while `src/popup/components/FindStyles.vue` and `src/background/preloader.ts` mostly surface generic errors and cache thumbnails/results opportunistically.
- Verified: UI surfaces contain many custom icon/title-only controls, two-click destructive buttons, overlays, toasts, and custom modals, but tests cover utilities/store behavior rather than focus management, accessible names, announcements, or rendered extension flows.

## Architecture Assessment
- Keep the background service worker as the privileged boundary. `src/background/messages.ts`, `src/background/styles.ts`, and `src/background/style-index.ts` are the right place for storage, import, sync, style lookup, and future `chrome.scripting` orchestration; content scripts should render UI and apply only least-privilege fallbacks.
- Style storage needs an adapter boundary before more sync/gallery features. `chrome.storage.local.styles` rewrites, Google Drive merge, Gist import, JSON import, rollback snapshots, and future IndexedDB migration should share one versioned schema and validation path.
- UserCSS support is partial. `src/utils/usercss.ts` extracts simple metadata and unwraps `@-moz-document`, but it does not preserve variables, update URLs, namespaces, preprocessor mode, full match scopes, or round-trip exports; existing roadmap already calls for full UserCSS.
- Style application needs an explicit cascade/frame/shadow model. Current document style tags can miss open shadow roots, over-rely on `!important`, and are hard to remove precisely across frames; platform APIs and constructable stylesheets provide safer paths when available.
- Gallery integration needs a provider abstraction. UserStyles.world search/install/update, preloading, thumbnails, local cache, and future Greasy Fork/USO archive support should use one health/status/cache contract.
- Testing gaps are clear: `npm test` passes 12 suites/85 tests and `npm run lint` passes, but there are no browser-loaded extension smoke tests, manifest/resource policy tests, sync conflict/tombstone tests, provider-outage tests, a11y checks, or package-artifact verification.
- Documentation gaps are concrete: `.github/ISSUE_TEMPLATE/*.md` still says Stylebot, source package READMEs still reference Stylebot/bootstrap-vue, and release docs/changelog are not synchronized with `package.json` and actual code.

## Rejected Ideas
- Anti-paywall reader features from `ROADMAP.md`: reject for now because they add legal/support risk and do not reinforce the core CSS editing product.
- CRDT/team spaces from `ROADMAP.md`: reject for now because single-user storage, sync tombstones, conflict reporting, and rollback must be reliable first.
- Vendoring Dark Reader's engine: reject for now because Dark Reader is a full rules ecosystem; StyleKit should first coordinate conflicts and improve its own CSS editing path.
- Arc-style CSS+JS boosts: reject for now because JavaScript boosts expand the threat model and contradict StyleKit's privacy-first CSS customization position.
- Chrome Prompt API or AI CSS editing: reject for now because deterministic local CSS tools fit the privacy promise better and the current trust/release work is higher value.
- Browser-store/CI release automation: reject because repo policy requires local builds/releases and no GitHub Actions; script local packaging verification instead.
- Mobile/iOS/Safari support as near-term work: reject for now because current manifests, README, and tests target Chrome/Firefox; revisit after desktop packaging and E2E validation are reliable.

## Sources
### Direct OSS and Adjacent
- https://github.com/openstyles/stylus
- https://github.com/openstyles/stylus/wiki/Usercss
- https://github.com/openstyles/usercss-meta
- https://github.com/ankit/stylebot
- https://github.com/darkreader/darkreader
- https://github.com/userstyles-world/userstyles.world
- https://greasyfork.org/en/help/installing-user-styles
- https://github.com/GoogleChromeLabs/ProjectVisBug
- https://github.com/sym3tri/CSS-Inject
- https://github.com/nelsonr/super-css-inject
- https://github.com/violentmonkey/violentmonkey
- https://github.com/antfu-collective/vitesse-webext
- https://github.com/crxjs/chrome-extension-tools

### Commercial and Closed Source
- https://getcssscan.com/
- https://cascadea.app/
- https://resources.arc.net/hc/en-us/articles/19235466306839-Boosts-Customize-Any-Website

### Platform and Standards
- https://developer.chrome.com/docs/extensions/reference/api/storage
- https://developer.chrome.com/docs/extensions/develop/concepts/messaging
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/reference/manifest/web-accessible-resources
- https://developer.chrome.com/docs/extensions/reference/api/userScripts
- https://web.dev/constructable-stylesheets/

### Dependency, Security, and Community Signal
- https://sass-lang.com/blog/import-is-deprecated/
- https://www.npmjs.com/package/bootstrap-vue-3
- https://www.npmjs.com/package/bootstrap-vue-next
- https://vite.dev/blog/announcing-vite8
- https://github.com/openstyles/stylus/issues/2064
- https://github.com/userstyles-world/userstyles.world/issues/385
- https://github.com/userstyles-world/userstyles.world/issues/386

## Open Questions
- None block the current P0/P1 work. Later store-publication choices may change permission wording, but the immediate storage, release-truth, injection, sync, and packaging work is implementable from current evidence.
