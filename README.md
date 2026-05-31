# tizenbrew-miruro-tv

Access Miruro on your Samsung Tizen TV. This is a simple TizenBrew site-mod wrapper based on the npm-published `@techytechster/miruro-tizen` package code and its TizenTube-style spatial-navigation setup.

## What it does

- Opens `https://miruro.to` in a browser on your Samsung TV
- Enables TV remote navigation (arrow keys to browse)
- Adds visible focus indicators so you can see where you are
- Adds an optional fake mouse mode for controls that spatial navigation cannot reach

## Remote Controls

- Arrow keys: normal spatial navigation
- Enter: select focused element
- Red / `ColorF0Red`: toggle fake mouse mode
- In fake mouse mode, arrow keys move the cursor
- In fake mouse mode, Enter clicks under the cursor
- In fake mouse mode, Back exits fake mouse mode

## Installation

1. Install [TizenBrew](https://github.com/reisxd/TizenBrew) on your Samsung TV
2. In TizenBrew module manager, add: `tizenbrew-miruro-tv`
3. Launch MiruroTV from your TV home screen
4. Use your remote's arrow keys to navigate, Enter to select, and Red for fake mouse mode

## That's it!

No stream scraping, provider changes, or Miruro backend modifications - just miruro.to accessible on your TV.

## Development Setup

Only needed if you want to build from source:

```bash
# Install dependencies
cd mods && npm install
cd ../service && npm install

# Build
cd mods && npm run build
cd ../service && npm run build
```

## Publishing to NPM

Package is published as `tizenbrew-miruro-tv`

To update:
1. Increment version in `package.json`
2. Run `npm publish --access public` from the root directory

## License

GPL-3.0-only, matching the included license file from the forked package contents.
