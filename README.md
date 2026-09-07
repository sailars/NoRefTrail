# Referer Guard

Small browser extension that removes the HTTP `Referer` header when you follow an external link from a domain you chose.

There are separate builds for Firefox and Chromium-based browsers such as Chrome, Vivaldi, Edge, Brave and others.

## What it changes

The rule is deliberately narrow. `Referer` is removed only when all of these conditions are true:

- the navigation starts from a domain in your list;
- the request loads the main page (`main_frame`);
- the request method is `GET`;
- the destination is a different site.

XHR, API calls, CSS, JavaScript, images, CDN resources and navigation inside the same site are left alone.

The domain list is empty after installation. You add only the sites you want.

## Builds

- `firefox/` - Firefox 142+
- `chromium/` - Chrome, Vivaldi, Edge, Brave and other Chromium browsers

Both builds use Manifest V3 and `declarativeNetRequest`.

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

Referer Guard does not collect or send data. Settings are stored locally in the browser. There are no content scripts, analytics, telemetry, remote code or network requests made by the extension itself.

## Permissions

- `storage` - stores the domain list and enabled state locally;
- `declarativeNetRequestWithHostAccess` - removes the `Referer` request header;
- access to HTTP and HTTPS sites - needed because an external link can point to any site.

## Release packages

Each release has two builds:

- Firefox
- Chromium (Chrome, Vivaldi, Edge, Brave and other Chromium browsers)

## License

MIT
