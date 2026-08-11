# epoch stamp

A single-page unix timestamp converter. Convert timestamps to dates and back, then shift the result by days, weeks, or months — the thing you actually reach for [epochconverter.com](https://www.epochconverter.com/) to do, minus everything else on that page.

**Live: https://epoch-stamp.vercel.app**

## Features

- **Two-column dashboard** — right now + shift time on the left, the two converters on the right, so every tool is visible without scrolling on a normal screen. Collapses to a single column on narrow viewports.
- **Right now** — a live-ticking unix timestamp (seconds + milliseconds) and local time.
- **Timestamp → date** — paste an epoch value, auto-detects seconds vs. milliseconds, shows local time, UTC, ISO 8601, and a relative ("in 3 days" / "5 hours ago") reading.
- **Date → timestamp** — pick a date & time (local or UTC) and get the epoch back in seconds and milliseconds.
- **Shift time** — the main event: pick a base timestamp, tap any number of offset chips (1 day, 7 days, 14 days, 1 month, 1 year, ...) or add a custom amount, and get new epoch values instantly. Add or subtract with one toggle.
- One-tap copy on every value. "Use as shift base" buttons chain the converters together.
- Bold monochrome "ledger" design — Fraunces + IBM Plex Mono/Sans, warm paper/ink palette, hairline borders, no drop shadows. Same visual language as [kosten koper](https://kosten-koper.vercel.app) and [xchange rate](https://xchange-rate-ruddy.vercel.app).
- Zero build step, zero external requests — everything computes in the browser.

## Stack

- Vanilla JS, no framework or bundler, no API calls
- [Fraunces](https://fonts.google.com/specimen/Fraunces) + [IBM Plex Sans](https://fonts.google.com/specimen/IBM+Plex+Sans) + [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) via Google Fonts

## Running locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deployment

Deployed on Vercel, connected to this repo's `main` branch for automatic deploys on push.
