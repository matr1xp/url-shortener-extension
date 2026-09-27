# Privacy Policy — ml1.app URL Shortener

**Last updated:** 27 September 2026

This policy explains what the *ml1.app URL Shortener* browser extension
("the extension") does with your data. It is deliberately short, because
the extension does very little with it.

## Summary

The extension is a thin client for a self-hosted URL shortener at
`https://s.ml1.app`. It sends a URL there when you explicitly ask it to
shorten one, and stores two small preferences in your browser. It has no
analytics, no tracking, no advertising, and no third-party services. The
developer operates the backend and does not sell, rent, or share your data
with anyone.

## What the extension sends off your device

The extension communicates with exactly one server: **`https://s.ml1.app`**,
operated by the developer. Nothing is sent anywhere else.

It sends data only in response to an action you take:

| You do this | The extension sends |
|---|---|
| Click **Shorten** in the popup | The URL in the input box, and an optional custom code you typed |
| Right-click → **Shorten this link / page** | The link URL, or the current tab's URL |
| Press the keyboard shortcut (Ctrl/Cmd+Shift+L) | The current tab's URL |
| Open **My links & stats** | Nothing; it requests your existing list of links |
| Save a prefix on the options page | The prefix text you entered |

These requests go to `/api/shorten`, `/api/stats`, and `/api/prefix`.

The extension does **not** send browsing history, page content, form data,
keystrokes, or the URLs of pages you merely visit. A URL leaves your device
only when you deliberately shorten it.

## Reading the current tab's URL

The extension uses Chrome's `activeTab` permission to read the address of
the tab you are on, so it can pre-fill the popup and support the
right-click and keyboard-shortcut actions. This happens only when you
invoke the extension. It cannot read tabs in the background, and it cannot
read the *contents* of any page — only the address of the tab you acted on.

## What is stored on your device

The extension stores three items through the browser's own storage:

- **`prefixEnabled`** (synced) — whether the "prefix my links" option is on.
- **`prefix`** (synced) — your short-link namespace, e.g. `ms`.
- **`lastResult`** (session only) — the most recently created short link, so
  the popup can show it to you. This is cleared when the browser closes.

The two synced values ride your browser's built-in sync, so they may be
copied between your own signed-in browsers by Chrome itself. The extension
does not transmit them anywhere else.

**No credentials or tokens are ever stored by the extension.** Sign-in is
handled entirely by Cloudflare Access using your browser's own session
cookie for `s.ml1.app`. The extension never sees, reads, or retains your
password or any authentication token.

## What the server stores

When you shorten a URL, the backend at `s.ml1.app` records the original
URL, the generated short code, a click count, a creation timestamp, and the
account identifier that Cloudflare Access supplies. This is what makes the
short link resolve and what populates the "My links & stats" page. You can
delete any link from that page, which removes it from the server.

Access to the backend is restricted by Cloudflare Access; it is not an open
public service.

## What the extension does not do

- No analytics or telemetry of any kind
- No advertising, ad targeting, or ad networks
- No tracking pixels, fingerprinting, or cookies set by the extension
- No third-party servers, SDKs, or CDNs — the extension loads no remote code
- No sale or transfer of user data to anyone
- No use of your data for anything beyond creating and listing your own
  short links

## Data retention and deletion

Links persist on the server until you delete them from the **My links &
stats** page. To clear the locally stored preferences, remove the extension
from your browser; the browser deletes its storage with it.

## Changes to this policy

Material changes will be reflected in this document, with the date at the
top updated. The current version is always the one published in the
extension's repository.

## Contact

Questions about this policy, or requests relating to your data, can be
raised via the project's issue tracker:
<https://github.com/matr1xp/url-shortener-extension/issues>
