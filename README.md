# Referer Guard

Small browser extension that prevents the HTTP `Referer` header from being sent when you follow an external link from a domain you chose.

There are separate builds for Firefox and Chromium-based browsers such as Chrome, Vivaldi, Edge, Brave and others.

## What it changes

The extension works only on top-level link navigation from domains in your list.

When a page belongs to a selected source domain, external HTTP/HTTPS links are assigned `referrerpolicy="no-referrer"` before navigation. Links that stay on the same selected site are left unchanged.

XHR, API calls, CSS, JavaScript, images, CDN resources and other background requests are not modified.

The domain list is empty after installation. You add only the sites you want.

## Version 1.1.0

Fixed Referer removal for external navigation in Chromium and Firefox.

Previous builds relied on request classification through `declarativeNetRequest`. In some real navigation flows, especially after an internal redirect performed by another extension, the final request could still contain the original `Referer` header.

Version 1.1.0 applies the browser's native `no-referrer` policy directly to external links on selected source pages before navigation. This makes the behavior independent of redirect chains and request classification.

## Builds

- `firefox/` - Firefox 142+
- `chromium/` - Chrome, Vivaldi, Edge, Brave and other Chromium browsers

Both builds use Manifest V3.

## Install for testing

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click `Load Temporary Add-on`.
3. Select `firefox/manifest.json`.

For normal permanent installation, use the signed package from Mozilla Add-ons when available.

### Chromium browsers

1. Open the extensions page, for example `chrome://extensions` or `vivaldi://extensions`.
2. Enable Developer mode.
3. Click `Load unpacked`.
4. Select the `chromium/` folder.

## Privacy

Referer Guard does not collect or send data. Settings are stored locally in the browser. There are no analytics, telemetry, remote code or network requests made by the extension itself.

## Permissions

- `storage` - stores the domain list and enabled state locally;
- access to HTTP and HTTPS pages through the content script - needed to apply `no-referrer` only on source domains selected by the user.

## Release packages

Each release has two builds:

- Firefox
- Chromium (Chrome, Vivaldi, Edge, Brave and other Chromium browsers)

## License

MIT
