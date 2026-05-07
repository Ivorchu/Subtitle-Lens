# Privacy Policy — Subtitle Lens

_Last updated: May 2026_

## Overview

Subtitle Lens is a Chrome browser extension that translates subtitles on
streaming websites in real time. We are committed to protecting your privacy.

## Data We Collect

**Subtitle Lens does not collect any personal data.**

We do not collect, store, log, or share:
- Your name, email address, or any account information
- Your browsing history or the websites you visit
- The content of videos you watch
- Any usage analytics or telemetry

## Data Sent to Third Parties

When you enable subtitle translation, the text of the current subtitle line
is sent to the translation provider you have selected:

- **MyMemory** (`api.mymemory.translated.net`) — if you opt in with your
  email address, that email is included in the request to unlock a higher
  daily usage limit. MyMemory's privacy policy applies to their service.
- **DeepL** (`api-free.deepl.com`) — if you choose DeepL as your provider
  and enter a DeepL Free API key. DeepL's privacy policy applies to their
  service.

Subtitle text is sent solely for the purpose of translation and is not
stored by Subtitle Lens.

## Data Stored Locally

The following data is stored locally in your browser using
`chrome.storage.sync` and never leaves your device except to sync across
your own Chrome profile:

- Extension settings (enabled state, language preferences, font size, etc.)
- Your DeepL API key (if provided)
- Your MyMemory email address (if provided)

A transient error status is stored in `chrome.storage.local` for up to
60 seconds to display error messages in the popup.

## Permissions

Subtitle Lens requests the following Chrome permissions:

- **storage** — to save your settings locally and sync them across devices
- **tabs** — to broadcast settings changes to active streaming tabs
- **host permissions** for `api.mymemory.translated.net` and
  `api-free.deepl.com` — to make translation API requests from the
  background service worker (required to avoid CORS restrictions)

## Changes to This Policy

If this policy changes, the updated version will be published at this URL
with a revised "Last updated" date.

## Contact

If you have questions about this privacy policy, please open an issue at
the project's GitHub repository.
