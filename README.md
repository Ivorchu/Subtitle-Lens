# Subtitle Lens

Chrome Manifest V3 extension that automatically translates subtitles on streaming websites.

## Features

- Detects subtitle/caption text via MutationObserver (no DOM mutation)
- Hides native subtitle layer with CSS (`opacity: 0`) so the platform keeps rendering captions
- Renders translated subtitles in a custom overlay
- Per-site adapter architecture — easy to extend to Netflix, Disney+, Prime Video
- Popup UI: enable/disable toggle, target language, font size, vertical position

## Supported Sites

| Site | Status |
|------|--------|
| YouTube | Supported |
| Netflix | Planned |
| Disney+ | Planned |
| Prime Video | Planned |

## Development Setup

```bash
npm install
npm run dev        # watch mode → dist/
npm run build      # production build → dist/
npm run type-check # TypeScript type checking only
```

## Loading in Chrome

1. Run `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the `dist/` folder
5. Navigate to `https://www.youtube.com/watch?v=...`
6. Turn on captions (CC button in the YouTube player)
7. The translated overlay appears at the bottom of the video

## Project Structure

```
src/
  shared/       # types, config, cache, debounce, translator
  sites/        # SiteAdapter interface + per-platform adapters
  content/      # MutationObserver orchestrator + overlay renderer
  background/   # Service worker: storage init + settings broadcast
  popup/        # Extension popup (HTML + CSS + TypeScript)
manifest.json
webpack.config.js
tsconfig.json
```

## Adding a New Platform

1. Create `src/sites/<platform>.ts` implementing `SiteAdapter`
2. Add the new URL pattern to `manifest.json` → `content_scripts[].matches`
3. Register the adapter in the `ADAPTERS` array in `src/content/index.ts`

## Icons

Place PNG icon files at:
- `icons/icon16.png`
- `icons/icon48.png`
- `icons/icon128.png`

The extension loads without them (Chrome uses a default icon).

## Replacing the Mock Translator

`src/shared/translator.ts` contains a `mockTranslate()` method that returns
`[lang] originalText`. Replace it with a real translation API call (Google Cloud
Translation, DeepL, LibreTranslate, etc.).
