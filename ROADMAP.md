# StyleKit Roadmap

Actionable work only. Historical and completed roadmap material is archived in CHANGELOG.md; blocked work is kept in Roadmap_Blocked.md.

## Actionable Items

- [ ] Multi-selector selection (shift-click) and selector simplification

- [ ] Gradient editor upgrade: conic gradients, multi-angle controls, copy-as CSS

- [ ] Per-element animation editor (keyframes panel with visual keyframe markers)

- [ ] Grid/flex overlay to visualize the target's layout context

- [ ] Font weight + variable-font axes picker for variable-font-enabled sites

- [ ] Persistent Monaco themes matching the three StyleKit UI themes

- [ ] CSS lint rule presets (strict, relaxed, "stylelint-config-standard") with per-site override

- [ ] Prettier-on-save toggle

- [ ] Minify-on-export toggle

- [ ] Diff view against previous saved version (not just the session start)

- [ ] User-created recipes alongside built-ins, shareable via JSON export

- [ ] Recipe marketplace fed from GitHub-hosted public recipe repos (with version pins)

- [ ] Per-site suggested recipes based on domain ("You're on YouTube - try YouTube Clean Feed")

- [ ] Snippet library with preview of what each snippet changes

- [ ] CRDT-based collaborative editing (Yjs) for shared style packs between team members

- [ ] Team spaces - share a set of styles across multiple authors with role-based permissions

- [ ] WebDAV / S3 sync in addition to Google Drive and Gist

- [ ] Selective sync (only sync certain styles/folders)

- [ ] Reading list with read-later queue, offline caching, and cross-device sync

- [ ] TTS + reading speed controls

- [ ] Word-count and estimated-reading-time per article

- [ ] Anti-paywall support for personally-subscribed sites (user provides cookie)

- [ ] Improved auto-dark generator with deep learning-free rule engine (Dark Reader-style static analysis)

- [ ] Per-site dark-mode palette overrides

- [ ] "Don't invert these elements" blacklist (images, videos, code blocks) with one-click picker

- [ ] Dark-mode vs system-preference coordination

- [ ] Contrast-fixer that auto-corrects failing WCAG AA pairs

- [ ] High-contrast mode preset

- [ ] Reduce-motion style bundle

- [ ] Color-blind-safe palette transforms (deutan, protan, tritan)

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
