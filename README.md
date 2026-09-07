# Referer Guard

Referer Guard removes the HTTP `Referer` header when you follow an external link from a domain you selected.

You decide which source domains are covered. The extension only affects top-level GET navigation to a third-party domain. It does not touch XHR, API calls, CSS, JavaScript, images, CDN resources, or navigation within the same site.

## How it works

1. Add a source domain in the extension popup.
2. Follow an external link from that site.
3. Referer Guard removes the `Referer` header before the request is sent.

The domain list is empty after installation. Subdomains of an added domain are covered as well.

## Privacy

Referer Guard does not collect or transmit data. Settings are stored locally in Firefox. There are no content scripts, analytics, telemetry, remote code, or network calls made by the extension itself.

## Permissions

- `storage` - stores the domain list and enabled state locally.
- `declarativeNetRequestWithHostAccess` - removes the `Referer` request header.
- access to HTTP and HTTPS sites - required because an external link can point to any site.

## Firefox compatibility

Firefox 142 or newer.

## Development

There is no build step. The source in this repository is the extension source.

To test it temporarily in Firefox:

1. Open `about:debugging#/runtime/this-firefox`.
2. Click "Load Temporary Add-on".
3. Select `manifest.json` from this repository.

## License

MIT
