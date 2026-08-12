# StyleKit

![License](https://img.shields.io/github/license/SysAdminDoc/StyleKit)
![Version](https://img.shields.io/badge/version-1.1.12-blue)
![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-green)
![Firefox](https://img.shields.io/badge/Firefox-Supported-orange)
![No Tracking](https://img.shields.io/badge/Analytics-None-brightgreen)

**StyleKit** is a browser extension that lets you customize any website's appearance instantly. Pick elements visually, tweak colors and fonts, or write raw CSS -- your changes are saved automatically and persist across visits.

Built on [Stylebot](https://github.com/ankit/stylebot) by Ankit Ahuja, StyleKit is a complete modernization with a Catppuccin Mocha dark theme, plain-English labels, guided onboarding, security hardening, and full Manifest V3 compliance.

## Features

### Visual CSS Editor
- **Point-and-click styling** -- select any element on the page, then adjust fonts, colors, spacing, borders, and visibility through an intuitive panel
- **Multi-select elements** -- hold Shift and click repeatedly while inspection stays active; selectors are deduplicated into one rule (e.g., `h1, h2, h3`)
- **Simplified selectors** -- prefer stable IDs and the shortest unique class combination, with an interactive ancestor/class selector picker for manual tuning
- **Element search** -- find elements by CSS selector, tag name, class, ID, or text content
- **Plain English labels** -- "Text Size" instead of `font-size`, "Fill Color" instead of `background-color`
- **1,500+ Google Fonts** -- full Google Fonts catalog with search/filter, cached for 1 week
- **Gradient generator** -- visual linear/radial/conic builder with live preview, sortable color stops, numeric/range/preset angles, radial/conic centers, and Copy CSS
- **Animation editor** -- build selector-scoped CSS animations with visual keyframe markers, timing controls, editable declarations, and one-click replay
- **Grid/flex context overlay** -- visualize a selected container or its parent layout with item bounds, grid tracks or flex axis, gaps, and selection highlights
- **Variable-font controls** -- apply precise numeric weight and metadata-backed axes such as width, optical size, slant, and grade using each font's supported range
- **Accessibility overlay** -- shows ARIA role and WCAG contrast ratio (pass/fail) in the element tooltip during inspect
- **Responsive preview** -- test styles at Mobile (375px), Tablet (768px), Laptop (1024px), and Desktop (1440px)
- **Color preset palette** -- 15 quick-pick colors above the color picker
- **Box model widget** -- visual margin/padding/border editor with Catppuccin dark theme
- **CSS variables panel** -- edit custom properties on the selected element
- **Computed styles view** -- see the current effective styles at a glance

### Code Editor
- **Full Monaco editor** -- syntax highlighting, autocomplete, word wrap
- **Persistent editor themes** -- switch Monaco between StyleKit Dark, Light, and Sepia palettes; the choice survives editor and browser restarts
- **CSS/SCSS mode toggle** -- switch syntax highlighting between CSS and SCSS
- **CSS linting** -- real-time Relaxed, Stylelint Standard, and Strict diagnostics with a global default and persistent per-site overrides
- **Prettier on save** -- opt into consistent CSS/SCSS formatting on Ctrl/Cmd+S or when leaving the editor; the preference persists across sessions
- **Live preview** -- CSS changes apply instantly as you type
- **Persistent saved-version diff** -- compare current CSS with the prior idle-separated saved revision, even after closing and reopening the editor
- **Copy / Export / Reset** buttons in the footer

### Popup
- **Find Styles** -- search [UserStyles.world](https://userstyles.world) for community styles matching the current site
- **Style auto-update** -- installed styles older than 24h are checked for updates; one-click update button
- **Hover preview** -- preview any style live on the page before installing
- **Install with one click** -- styles are saved and applied immediately
- **Toggle installed styles** -- enable/disable individual installed styles
- **Auto-load mode** -- thumbnails pre-fetched in the background for instant popup loading
- **Provider health cache** -- UserStyles.world outages show degraded status, retry timing, and last-good cached results
- **Restricted page detection** -- shows "Not available on this page" on chrome:// and system pages

### Site Recipes & Snippets
- **20+ pre-built recipe packs** for YouTube, Reddit, GitHub, Twitter, and more
- **Universal recipes** (dark mode, compact layout, etc.)
- **User-created recipes** -- capture, edit, preview, apply, delete, and share reusable site or universal recipes through validated versioned JSON
- **Pinned recipe marketplace** -- add public GitHub `owner/repo` feeds at semantic-version tags or immutable commit SHAs, then validate and install recipes locally
- **Domain-aware suggestions** -- surface an apply-ready primary recipe for supported sites, with exact hostname/subdomain matching that rejects lookalike domains
- **Snippet change previews** -- hover/focus for a transient live effect or pin an accessible before/after declaration panel, then keep or exactly restore the prior CSS

### Sync & Backup
- **Google Drive sync** -- automatic bidirectional sync across devices
- **GitHub Gist backup** -- export/import via private Gist with Bearer token auth
- **WebDAV and S3 sync** -- merge the versioned style/tombstone and reading-list payload through an exact remote object URL with ETag-safe WebDAV writes or signed AWS Signature V4 requests
- **Selective sync** -- choose individual URL-keyed styles for Google Drive, WebDAV, and S3 while excluded local styles remain private and untouched by remote merges
- **Yjs collaborative packs** -- capture saved styles into bounded CRDT documents, merge concurrent teammate update files, and apply converged CSS with rollback protection
- **Role-based team spaces** -- organize collaborative packs into named teams, assign owner/editor/viewer permissions, and exchange targeted invitations or update bundles through a trusted channel
- **Rollback restore** -- JSON imports, Gist imports, and Google Drive sync overwrites save a local snapshot that can be restored from the Sync tab
- **Import dry runs** -- JSON, Gist, URL, and UserStyles.world imports validate schema/content and show add/change/remove counts before replacing styles
- **JSON export** -- versioned format with metadata (`{version, app, exportedAt, styles}`)
- **CSS export** -- all styles as a single `.css` file with URL comments
- **Optional minified CSS export** -- remove redundant whitespace while preserving per-site boundaries, without changing saved styles or JSON backups
- **JSON import** -- validates structure, supports both versioned and legacy formats
- **Privacy-safe diagnostics** -- export version, browser, permissions, storage usage, and recent redacted errors without CSS or tokens

### Readability Mode
- Distraction-free reader view with customizable font, size, width, line height, and theme
- Works on SPAs with automatic re-application on navigation
- **Read-later queue** -- save readable pages from the popup, mark them read/unread, and remove them from a dedicated options view
- **Offline snapshots** -- keep bounded, allowlist-sanitized text-first article copies without scripts, forms, cookies, trackers, or remote image dependencies
- **Cross-device reading sync** -- merge article updates and deletion tombstones through configured Google Drive, WebDAV, or S3 sync

### Other
- **One-click hide element** -- right-click context menu
- **Onboarding walkthrough** -- 3-step guided tour on first use
- **Undo toast** -- visual feedback after each change with Undo button
- **Keyboard shortcuts** -- fully customizable (Escape closes editor from any context)
- **Dark mode generation** -- automatic dark theme for any page
- **Grayscale mode** -- reduce eye strain
- **15+ language translations**
- **Two-click delete confirmation** -- prevents accidental style deletion
- **Accessible extension UI** -- named icon controls, contained/restored modal focus, announced status messages, visible keyboard focus, and reduced-motion-safe effects
- **Narrow extension resource exposure** -- content-script assets are allowlisted exactly and Chrome builds use dynamic web-accessible URLs
- **USER-origin CSS application** -- saved styles and previews use browser-managed USER-origin CSS insertion when available, with DOM fallback for restricted pages
- **Frame-aware matching** -- child frames match their own URL, while `about:blank` and `srcdoc` frames inherit the parent referrer only when it is valid
- **Open shadow-root styling** -- opt individual styles into web-component shadow roots; closed roots remain browser-protected
- **External-editor live reload** -- opt styles into validated HTTPS, localhost, or local-file CSS sources with interval checks, visible status/errors, automatic snapshots, and one-click rollback

## Installation

### From Release

1. Download `StyleKit-v1.1.12-chrome.zip` from [Releases](https://github.com/SysAdminDoc/StyleKit/releases)
2. Unzip the file
3. Open `chrome://extensions`
4. Enable **Developer mode**
5. Click **Load unpacked** and select the unzipped folder

### From Source

```bash
git clone https://github.com/SysAdminDoc/StyleKit.git
cd StyleKit
nvm use
npm install
npm run build
```

Then load the `dist/` folder as an unpacked extension.

### Firefox

```bash
npm run build:firefox
```

Load from `firefox-dist/`.

## Development

```bash
nvm use               # Node 22.12.0 or newer
npm run watch          # Dev build with hot reload (Chrome/Edge)
npm run watch:firefox  # Dev build (Firefox)
npm test               # Run tests (63/63 suites, 253 tests)
npm run lint           # ESLint check
npm run lint:fix       # Auto-fix lint issues
npm run locales:check  # Validate locale keys and placeholders against English
npx playwright install chromium # One-time E2E browser install
npm run test:e2e       # Build both targets and smoke-test a clean Chromium profile
npm run dependencies:check # Report safe and compatibility-review dependency updates
npm run release:artifacts  # Build and verify versioned ZIP/CRX release assets
```

`npm run test:e2e` loads the built extension in an isolated temporary profile, renders the popup and options page, captures and opens a sanitized offline article, applies CSS to document and open-shadow-root fixtures, verifies minified export, user-authored recipe persistence/export/application, saved-version diffs, loopback live-source reload/rollback, selective WebDAV style/reading-list sync, Shift-click multi-selection, grid/flex context visualization, variable-font axes, conic-gradient controls, visual keyframe animations, collaborative packs, role-based team invitations, and persisted Monaco themes/lint/Prettier settings.

`npm run release:artifacts` removes old versioned StyleKit assets, builds Chrome and Firefox, creates deterministic ZIPs with POSIX entry paths, and signs and verifies a CRX when `dist.pem` or `STYLEKIT_CRX_KEY` is available.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Context Menu | On | Right-click "Style with StyleKit" on any page |
| Readability | Off | Show/hide the Readability mode button |
| Auto-Load Styles | Off | Auto-search UserStyles.world when popup opens |
| Fonts | System defaults | Custom font list for the font picker |
| Keyboard Shortcuts | Configurable | Customize all editor hotkeys |

## Tech Stack

- **Vue 3** + Vuex 4 + TypeScript
- **Vite 8** (multi-entry Rollup build)
- **Bootstrap 5** + bootstrap-vue-next
- **Monaco Editor** (embedded iframe)
- **Vitest** + jsdom for testing
- **PostCSS** (cssnano, rem-to-pixel)
- **Catppuccin Mocha** dark palette

## Architecture

```
src/
  background/     Service worker (MV3, ES module)
  editor/         Content script - visual CSS editor (Shadow DOM)
  inject-css/     Content script - applies saved CSS (document_start)
  popup/          Browser action popup
  options/        Extension options page
  readability/    Reader mode (Shadow DOM)
  monaco-editor/  Code editor iframe
  sync/           Google Drive + Gist sync
  css/            PostCSS utilities
  dark-mode/      Dark mode CSS generation
  highlighter/    Element overlay for inspector
```

## Privacy

**StyleKit collects nothing. No analytics. No tracking. No telemetry. Period.**

Your styles and offline reading snapshots are stored locally. Cloud sync (Google Drive, Gist, WebDAV, or S3) is opt-in and goes directly to storage you configure -- StyleKit never sees or stores your data. Reading snapshots contain extracted article text and links, never page cookies or credentials.

## Security

StyleKit includes comprehensive security hardening:

- **Sender validation** on all background message handlers
- **Trusted local storage** restricted to extension pages and the background service worker
- **`textContent`** for all CSS injection (never `innerHTML`)
- **Origin- and source-restricted Monaco `postMessage`** (never wildcard `*`)
- **URL validation** for thumbnail fetches, one-time CSS imports, and live sources (HTTPS plus explicit loopback/file contracts)
- **RegExp safety** with try/catch to prevent ReDoS
- **Content-type validation** on CSS imports
- **Allowlist-sanitized offline articles** with active HTML, forms, remote images, and unsafe URL schemes rejected again at the background storage boundary

## Related Tools

| Tool | Best For |
|------|----------|
| **StyleKit** (this repo) | Casual users: visual editor, plain-English labels, onboarding, recipes |
| [StyleCraft](https://github.com/SysAdminDoc/StyleCraft) | Power users: full CSS editor, syntax highlighting, Stylus import |

## Credits

StyleKit is built on [Stylebot](https://github.com/ankit/stylebot) by [Ankit Ahuja](https://github.com/ankit), licensed under MIT.

## License

MIT
