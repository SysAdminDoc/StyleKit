# StyleKit Roadmap

Roadmap for StyleKit, the modernized Stylebot fork: Vue 3 + Vuex 4 + Vite 5 + Monaco, Chrome + Firefox MV3, Google Drive / Gist sync, UserStyles.world browser.

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
