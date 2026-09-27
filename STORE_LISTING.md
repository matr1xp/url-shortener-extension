# Chrome Web Store listing copy

Working draft for the Developer Dashboard. Not shipped in the extension —
this file is a place to keep the text under version control so resubmissions
don't start from scratch.

Field limits below are the long-standing Chrome Web Store values; confirm
them against the dashboard as you paste, since Google does not document them
on the listing help page.

---

## Store Listing tab

### Extension name
*(limit ~45 characters)*

```
ml1.app URL Shortener
```

> 21 characters. Matches `manifest.json` — keep the two in sync.

### Short description / summary
*(limit ~132 characters — plain text, no formatting)*

```
Shorten the current tab or any link with your self-hosted ml1.app shortener. Copies the result automatically.
```

> 109 characters.

### Detailed description
*(limit ~16,000 characters)*

```
A fast, minimal client for your own self-hosted ml1.app URL shortener.

This extension does not provide a shortening service of its own — it talks
to an ml1.app instance that you run. If you don't have one, this extension
will not be useful to you.

WHAT IT DOES

• Toolbar popup — opens pre-filled with the current tab's URL. Shorten it as
  is, or set a custom code. The short link is copied to your clipboard
  automatically.

• Right-click menu — shorten any link on a page, or the page itself, without
  opening the popup.

• Keyboard shortcut — Ctrl+Shift+L (Cmd+Shift+L on macOS) shortens the
  current tab and copies the result in one step.

• My links & stats — a full list of your short links with click counts and
  creation dates, and one-click delete.

• Optional namespace prefix — group your links under a personal prefix, so
  they read like ml1.app/yourname/my-link.

SIGN-IN

Authentication rides on your browser's existing Cloudflare Access session
for your instance. There is nothing to configure and no token to paste. If
your session has expired, the extension shows a "Sign in" button that takes
you to the login page; once you're back, it just works.

The extension never sees or stores your password or any authentication
token.

PRIVACY

• No analytics, no telemetry, no advertising, no tracking.
• No third-party servers and no remote code — the extension talks only to
  your own instance.
• A URL is sent only when you explicitly ask for it to be shortened.
• Only two preferences are stored: whether your prefix is enabled, and what
  it is.

Permissions are kept to the minimum the features need, and host access is
restricted to your shortener's domain alone.

OPEN SOURCE

Source, issue tracker, and build scripts:
https://github.com/matr1xp/url-shortener-extension
```

---

## Privacy tab

### Single purpose description

```
This extension shortens URLs using the user's own self-hosted ml1.app
shortener instance, and lets the user view and delete the short links they
have created. Every feature — the toolbar popup, the right-click menu, the
keyboard shortcut, and the links list — serves that single purpose.
```

### Permission justifications

**`activeTab`**
```
Used to read the URL of the tab the user is currently on, so the popup can
pre-fill it and the keyboard shortcut can shorten it. Accessed only when the
user invokes the extension. Page content is never read.
```

**`contextMenus`**
```
Adds two right-click entries, "Shorten this link with ml1.app" and "Shorten
this page with ml1.app", which are a primary way users invoke the extension.
```

**`clipboardWrite`**
```
Writes the newly created short link to the clipboard so the user can paste
it immediately. This is the expected outcome of shortening a URL and avoids
a manual copy step.
```

**`storage`**
```
Stores two user preferences (whether the link prefix is enabled, and the
prefix itself) and caches the most recent result for the session so the
popup can display it. No personal or browsing data is stored.
```

**`offscreen`**
```
Required to write to the clipboard from the Manifest V3 service worker,
which has no DOM of its own. This is the documented Chromium workaround and
is used solely for the copy-to-clipboard step above.
```

**Host permission — `https://s.ml1.app/*`**
```
The extension's entire function is calling this API: creating short links,
listing the user's links with click counts, deleting them, and reading or
setting the user's prefix. This is the user's own self-hosted instance and
is the only host the extension contacts.
```

### Remote code

```
No — the extension does not use remote code. All JavaScript is packaged in
the extension; nothing is fetched or evaluated at runtime.
```

### Data collection disclosures

Tick **none** of the data-type boxes. The extension does not collect any of
the listed categories (personally identifiable information, health, financial,
authentication, personal communications, location, web history, or user
activity). URLs are transmitted to the user's own server at their explicit
request and are not collected by the developer through the extension.

> If the dashboard requires a category for the URLs being sent, disclose
> "Website content" and note that it is sent only on explicit user action to
> the user's own self-hosted instance. Choose accuracy over minimising.

### Certifications

All three must be ticked:
- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

### Privacy policy URL

```
<host PRIVACY.md and paste the URL here>
```

Suggested: enable GitHub Pages on the repo and link the rendered
`PRIVACY.md`, or serve it at `https://ml1.app/privacy`.

---

## Distribution tab

- **Visibility:** Unlisted — the backend is access-gated, so a public
  listing invites rejection on the grounds that reviewers and the general
  public cannot use it.
- **Regions:** All.
- **Pricing:** Free.

## Test instructions tab

Reviewers cannot use the extension without an account on the instance.
Say so plainly rather than leaving it blank:

```
This extension is a client for a private, self-hosted URL shortener at
s.ml1.app, protected by Cloudflare Access. It is published Unlisted for the
operator's own use and is not intended for general distribution.

Without an account on that instance, the extension will correctly show its
"Not signed in to Cloudflare Access" state with a Sign in button — that is
expected behaviour, not a failure. The popup, options page, right-click
entries, and keyboard shortcut can all be exercised in that state.

If you need an authenticated walkthrough to complete the review, please
request credentials via the contact email on the developer account and we
will provision a temporary reviewer account.
```

---

## Pre-submission checklist

- [ ] Screenshots: 1280×800, 1–5 of them (popup, options page, right-click menu)
- [ ] Small promo tile: 440×280
- [ ] Store icon 128×128 — exists, but verify it reads on light *and* dark
- [ ] Privacy policy hosted, URL pasted into the dashboard
- [ ] Version incremented if this version was uploaded before
- [ ] `./build.sh` run, `dist/url-shortener-chrome.zip` fresh
- [ ] Visibility set to **Unlisted**
- [ ] README updated with the store link once published
