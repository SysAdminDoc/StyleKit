# StyleKit

![License](https://img.shields.io/github/license/SysAdminDoc/StyleKit)

StyleKit is a browser extension that lets you customize any website's appearance instantly. It is a modernized fork of [Stylebot](https://github.com/ankit/stylebot) by Ankit Ahuja, with new features focused on making CSS customization accessible to everyone.

## What's New in StyleKit v4.0.0

StyleKit builds on Stylebot v3.1.4 with significant improvements:

- **Plain English Property Labels** - CSS jargon replaced with friendly terms ("Text Size", "Fill Color", "Letter Gap")
- **Section Hints** - Each editor section shows a brief description of what's inside
- **One-Click Hide Element** - Right-click any element and choose "Hide Element" to instantly hide it
- **Color Preset Palette** - 15 quick-pick color buttons above the color picker
- **Font Picker with Previews** - System fonts displayed with live font-family preview
- **Site Recipe Library** - 20 pre-built style packs for popular sites (YouTube, Reddit, GitHub, etc.) plus universal recipes
- **Export Style as JSON** - Download current styles as a portable JSON file from the footer
- **Onboarding Walkthrough** - 3-step guided tour on first use
- **Undo Toast Notifications** - Visual feedback after each style change with an Undo button
- **Change Count Badge** - See how many changes you've made in the header
- **Reset All Button** - Clear all styles for the current page with one click
- **Persistent Inspector** - Element selector stays active across page loads
- **Catppuccin Mocha Dark Theme** - Premium dark UI throughout
- **New Icon & Branding** - Fresh identity with custom-designed icon

## Features

- Pick and style elements using a visual editor
- Changes are saved instantly and persist across visits
- Full CSS code editor with Monaco
- Readability mode for distraction-free reading
- Grayscale mode to reduce eye strain
- Site recipes for one-click improvements to popular websites
- Google Drive and GitHub Gist sync
- Export/import styles as JSON or CSS
- 15+ language translations

## Installation

### From Source

1. Clone this repository
2. Run `npm install` (or `yarn`)
3. Run `NODE_OPTIONS=--openssl-legacy-provider npm run build`
4. Open `chrome://extensions`
5. Enable Developer mode
6. Click "Load unpacked" and select the `dist/` folder

### Firefox

1. Run `npm run build:firefox`
2. Load from `firefox-dist/`

## Development

```bash
# Watch mode (Chrome/Edge)
npm run watch

# Watch mode (Firefox)
npm run watch:firefox

# Run tests
npm test

# Lint
npm run lint
```

## Related Tools

| Tool | Type | Best For |
|------|------|----------|
| **StyleKit** (this repo) | Stylebot fork | Casual users who want plain-English labels, guided onboarding, and one-click site recipes |
| [StyleCraft](https://github.com/SysAdminDoc/StyleCraft) | Ground-up MV3 extension | Power users who want a full CSS editor with syntax highlighting, linting, autocomplete, Stylus import, and UserStyles.world integration |

If you outgrow the visual editor and want a professional-grade CSS manager with no build step required, see [StyleCraft](https://github.com/SysAdminDoc/StyleCraft).

## Credits

StyleKit is built on [Stylebot](https://github.com/ankit/stylebot) by [Ankit Ahuja](https://github.com/ankit), licensed under MIT. All original contributors are credited through the git history.

## License

MIT
