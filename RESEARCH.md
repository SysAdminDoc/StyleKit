# Research - StyleKit

## Executive Summary
StyleKit is a local-first Chrome/Firefox WebExtension for visual website restyling: it combines Stylebot-style point-and-click editing, Monaco code editing, UserStyles.world discovery, Google Drive/Gist backup, rollback snapshots, readability mode, and beginner-friendly copy. Its strongest current shape is fast casual CSS customization with a privacy promise and a modern Vue/Vite MV3 stack. The highest-value direction is to keep hardening privileged extension boundaries and style application semantics before adding more marketplace or collaboration features. Priority opportunities: add shadow-root injection coverage, preserve full UserCSS metadata/variables, script packaging/E2E checks, replace deprecated UI dependencies, and add manual dependency/Sass/a11y ratchets.

## Product Map
- Core workflows: inspect/select page elements, edit CSS visually, edit raw CSS in Monaco, preview/install UserStyles.world styles, import/export or sync styles, restore the last bulk-change rollback snapshot.
- User personas: casual users who want plain-English style controls; power users who write CSS/UserCSS; privacy-conscious users avoiding telemetry; cross-browser users moving styles between Chrome and Firefox.
- Platforms and distribution: Chrome/Chromium MV3 from `dist/`, Firefox MV3 from `firefox-dist/`, GitHub release ZIP/CRX artifacts, local-only build/test/release workflow.
- Key integrations and data flows: IndexedDB stores saved styles with `chrome.storage.local` fallback/metadata; content scripts request saved CSS at `document_start` and the background applies USER-origin CSS where browser permissions allow; background/popup code fetches UserStyles.world, Google Drive, GitHub Gist, Google Fonts, thumbnails, and imported CSS.

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
- Verified current in v1.1.11: package/README/source manifest versions, README install text, changelog date, and test counts align with 20 suites/119 tests.
- Verified resolved in v1.1.4: `src/background/index.ts` restricts `chrome.storage.local` to trusted contexts, and editor onboarding/Google Fonts cache now route through typed background messages instead of direct content-script `storage.local` calls.
- Verified resolved in v1.1.5: `src/extension/manifest.json` no longer exposes broad `chunks/*` or Monaco globs; `vite.config.ts` derives exact content-script imports for built web-accessible resources, and Chrome builds set `use_dynamic_url`.
- Verified resolved in v1.1.6: JSON, Gist, URL, `@import`, and UserStyles.world imports share schema/content-type validation and add/change/remove previews through `src/utils/style-import.ts`.
- Verified resolved in v1.1.7: Google Drive sync writes versioned `{styles,tombstones}` payloads, migrates legacy raw maps, prevents local/remote deletions from resurrecting, and reports simultaneous edit conflicts with local/remote modified times.
- Verified resolved in v1.1.8: saved styles read/write through `src/background/style-storage.ts`, migrate legacy `chrome.storage.local.styles` into IndexedDB, preserve the old chrome-storage object as rollback source, and fall back when IndexedDB is unavailable.
- Verified resolved in v1.1.9: `src/background/style-applier.ts` applies saved styles and popup previews with `chrome.scripting.insertCSS/removeCSS` at USER origin, removes stale/replaced CSS, and keeps DOM style injection as a fallback when scripting CSS is unavailable.
- Verified resolved in v1.1.10: `src/background/styles.ts` resolves frame match URLs explicitly, child frames match their own URLs, `about:blank`/`about:srcdoc` use a valid parent referrer, and unmatchable frames return no CSS with a blocked reason.
- Verified resolved in v1.1.11: `src/background/userstyles-provider.ts` centralizes UserStyles.world index health, last-good cache, sanitized provider diagnostics, and retry backoff; `src/popup/components/FindStyles.vue` shows degraded status and keeps cached results available without mutating installed styles on failed CSS/update fetches.
- Verified: UI surfaces contain many custom icon/title-only controls, two-click destructive buttons, overlays, toasts, and custom modals, but tests cover utilities/store behavior rather than focus management, accessible names, announcements, or rendered extension flows.

## Architecture Assessment
- Keep the background service worker as the privileged boundary. `src/background/messages.ts`, `src/background/styles.ts`, and `src/background/style-index.ts` are the right place for storage, import, sync, style lookup, and future `chrome.scripting` orchestration; content scripts should render UI and apply only least-privilege fallbacks.
- Style storage now has an IndexedDB adapter boundary, but future sync/gallery features still need finer-grained CRUD paths rather than full-map replacement for every bulk operation.
- UserCSS support is partial. `src/utils/usercss.ts` extracts simple metadata and unwraps `@-moz-document`, but it does not preserve variables, update URLs, namespaces, preprocessor mode, full match scopes, or round-trip exports; existing roadmap already calls for full UserCSS.
- Style application still needs an explicit shadow-root model. USER-origin insertion and frame URL guards now cover normal documents and opaque child frames, but open shadow roots still need targeted cleanup and tests.
- Gallery integration now has a first provider health/cache boundary for UserStyles.world in `src/background/userstyles-provider.ts`; future Greasy Fork/USO archive support should extend that status/cache contract rather than adding popup-only fetch paths.
- Testing gaps are clear: `npm test` passes 20 suites/119 tests and `npm run lint` passes, and this pass added provider-outage tests plus a manual rendered popup smoke; there are still no committed browser-loaded extension smoke tests, a11y checks, or package-artifact verification scripts.
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
