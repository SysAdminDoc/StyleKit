# StyleKit Changelog

## Version 4.0.0 (March 2026) - Fork of Stylebot v3.1.4

StyleKit is a modernized fork of [Stylebot](https://github.com/ankit/stylebot) by Ankit Ahuja. This release includes all features from Stylebot v3.1.4 plus the following additions:

### New Features

- **Plain English Property Labels** - Replaced CSS jargon with user-friendly terms throughout the editor (e.g. "Text Size" instead of "font-size", "Fill Color" instead of "background", "Letter Gap" instead of "letter-spacing")
- **Section Hint Descriptions** - Each collapsible editor section shows a brief subtitle explaining its contents (e.g. "Font, size, spacing, alignment" under Text & Fonts)
- **One-Click Hide Element** - New right-click context menu option to instantly hide any element with `display: none` without opening the editor
- **Color Preset Palette** - 15 quick-pick color buttons (White, Black, Link Blue, Red, Transparent, etc.) displayed above the color picker
- **Font Picker with Previews** - System fonts listed with live font-family preview and organized under "Your Fonts" / "Common Fonts" section headers
- **Site Recipe Library** - 20 pre-built style packs: 12 site-specific recipes (YouTube, Reddit, Twitter/X, GitHub, Google, Amazon, Wikipedia, Facebook) and 8 universal recipes (Dark Mode, Larger Text, Maximum Readability, Hide All Images, etc.)
- **Export Style as JSON** - Footer button to download current page styles as a portable JSON file
- **3-Step Onboarding Walkthrough** - Guided overlay on first use: Pick an Element, Style It Visually, Try Snippets & Recipes
- **Undo Toast Notifications** - Visual feedback after each style change with an inline Undo button
- **Change Count Badge** - Header badge showing number of CSS changes made in current session
- **Reset All Button** - Footer button to clear all styles for the current page
- **Persistent Element Inspector** - Inspector state survives page loads via `chrome.storage.session`

### UI/UX Improvements

- **Catppuccin Mocha Dark Theme** - Premium dark palette applied to header, footer, onboarding, and all new components
- **Flexbox Editor Layout** - Converted editor from fixed-height to flexbox layout so the footer stays pinned when content expands
- **New Icon & Branding** - Custom-designed icon with CSS curly braces and paint accent

### Bug Fixes

- Fixed footer disappearing when expanding menu sections
- Fixed Chrome extension messaging errors with `.catch()` on `sendMessage` calls

---

## Stylebot Version History (Pre-Fork)

### Version 3.1.4 (May 2024)

- Chrome and Edge Only release
- Migrate extension to use Manifest v3
- Improve translations (#758, #755, #734)

### Version 3.1.3 (July 2022)

- Improved Japanese translation (#714)
- Restrict import file type to json (#708)
- Fix bug to correctly adjust page layout when stylebot is first opened on a page
- Fix font picker for readability
- Fix bug with wildcard usage (#700)
- Fix Portuguese locale configs

### Version 3.1.1 (July 2022)

- Allow adding custom fonts via Options page (#707)
- Fix issues and improve domain matching logic (#690)
- Fix style editor in Options page (#669)
- Add Portuguese translation (#673)
- Translation fixes (#697, #683, #679)

### Version 3.1 (May 2021)

- Added ability to resize stylebot editor
- Added support for syncing and backing up styles using Google Drive
- Added ability to reduce page's width when stylebot is opened
- Add color palettes for easier color selection
- Bugfixes (#629, #626, #607, #595)

### Version 3.0 and earlier

See the [original Stylebot repository](https://github.com/ankit/stylebot) for full version history.
