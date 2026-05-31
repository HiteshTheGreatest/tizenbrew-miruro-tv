# tizenbrew-miruro-tv

TizenBrew site-mod module for Miruro.tv that improves Samsung TV remote usability. It injects navigation, visible focus, video shortcuts, and a switchable fake-mouse cursor layer.

This module only changes client-side controls and UI navigation. It does not scrape streams, bypass protections, remove ads, modify providers, or call Miruro backend APIs.

## Features

- Remote-control mode by default
- Red remote button toggles Remote Mode and Mouse Mode
- Long-press Enter or keyboard `M` as fallback mode switches
- Directional focus navigation for links, buttons, inputs, cards, search results, videos, and visible clickable elements
- Fake mouse cursor mode using `document.elementFromPoint(x, y)`
- Play/pause and 10-second seek controls for the active video element
- SPA support with MutationObserver, history listeners, and lightweight refreshes
- Small auto-hiding overlay with current mode and hint

## Remote Keys

| Key | Remote Mode | Mouse Mode |
| --- | --- | --- |
| Red / `ColorF0Red` | Toggle Mouse Mode | Toggle Remote Mode |
| Arrow keys | Move focus | Move cursor |
| Enter | Click focused item | Click cursor target |
| Long-press Enter | Toggle mode | Toggle mode |
| Back | Close overlay or go back | Return to Remote Mode |
| `MediaPlayPause` | Play/pause active video | Play/pause active video |
| `MediaRewind` | Seek back 10 seconds | Seek back 10 seconds |
| `MediaFastForward` | Seek forward 10 seconds | Seek forward 10 seconds |
| `M` keyboard | Toggle mode | Toggle mode |

## Install

1. Build the package:

   ```sh
   npm install
   npm run build
   ```

2. Publish or pack it as an npm package:

   ```sh
   npm pack
   ```

3. In TizenBrew on the TV, open the module manager and add:

   ```text
   tizenbrew-miruro-tv
   ```

The package is configured as a TizenBrew site modification module:

- `packageType`: `mods`
- `websiteURL`: `https://miruro.tv/`
- `main`: `dist/index.js`
- `serviceFile`: `dist/service.js`

## Development

```sh
npm install
npm run watch
```

The source is split by responsibility:

- `src/index.js` wires mode switching, key handling, and SPA refresh
- `src/focusMode.js` handles directional remote focus
- `src/mouseMode.js` renders and controls the fake cursor
- `src/playerControls.js` controls the active video element
- `src/overlay.js` shows mode toasts and injects styles
- `src/keys.js` normalizes Samsung/Tizen key names
- `src/styles.css` contains injected UI styles

## Safety Notes

This project intentionally avoids stream extraction, ad bypassing, DRM bypassing, provider changes, login changes, and backend/API modification. It only dispatches normal DOM input events and controls existing video elements exposed by the page.
