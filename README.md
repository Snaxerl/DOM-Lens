# DOM Lens

A fast, human-friendly DOM inspector for Chromium browsers. Pick an element and immediately get readable element information, copy-ready selectors, Playwright locators, box-model data, computed styles and basic accessibility checks.

## Features

- Hover highlight and click-to-pin inspection
- DOM breadcrumbs for quick parent navigation
- CSS selector with stability rating
- XPath, JavaScript `querySelector` and Playwright locator
- Element size, position and box model
- Curated computed styles instead of a wall of CSS
- Basic accessibility checks and accessible-name inspection
- Attribute viewer with copy actions
- Light and dark themes
- Runs entirely in the browser extension

## Install from source

1. Clone or download this repository.
2. Run `npm run build`.
3. Open `chrome://extensions`.
4. Enable **Developer mode**.
5. Choose **Load unpacked** and select the `dist/` directory.
6. Open a normal webpage, click the DOM Lens icon and choose **Inspect this page**.

Chrome blocks extensions on some internal pages such as `chrome://` and the Chrome Web Store.

## Development

```bash
npm run typecheck
npm test
npm run build
npm run check
npm run package
```

The project intentionally has no runtime dependencies.

## Selector strategy

DOM Lens prefers, in order:

1. Unique IDs
2. Common test attributes such as `data-testid`
3. Unique `name` attributes
4. Useful semantic class combinations
5. A structural path, with a warning when sibling order is required

A stability label is guidance, not a guarantee. Applications can generate IDs or classes dynamically.

## Accessibility scope

The accessibility tab performs small, element-level checks. It is not a replacement for a full accessibility audit or assistive-technology testing.

## Privacy

DOM Lens only inspects pages after you activate the inspector. It does not send page content to a server.

## License

MIT
