# Architecture

DOM Lens is split into four areas:

- `src/core`: deterministic selector, locator and accessibility logic.
- `src/content`: the page inspector, highlight overlay and Shadow DOM panel.
- `src/popup`: activation UI.
- `src/background`: extension lifecycle defaults.

The inspector UI lives in a closed visual layer created with Shadow DOM so site styles do not leak into the panel. The highlight overlay is pointer-transparent. Click interception only occurs while inspection is active, preventing accidental navigation while selecting an element.

The build script bundles the content-side TypeScript into a single classic content script and compiles popup/background scripts separately. No third-party bundler is required.
