# Smart Home Inventory — website

A single static page: hero + download, features, changelog, feedback, donate, contact.
No build step, no framework — just `index.html`, `css/style.css`, and `assets/`.

## Deploying

Any static host works — GitHub Pages, Netlify, Cloudflare Pages, or plain FTP to a
shared host. Upload this whole `website/` folder as the site root.

Two things need real values before you go live:

1. **`downloads/Smart-Home-Inventory-Setup-latest.exe`** — see `downloads/README.md`.
2. **`updates/win/latest.yml` + the matching `.exe`** — see `updates/win/README.md`,
   and update `UPDATE_FEED_URL` in `electron/main.js` plus `build.publish[0].url` in
   the root `package.json` to your real domain once you have one.

## Releasing a new version

1. Bump `"version"` in the root `package.json`.
2. `npm run dist` — produces the new installer + `latest.yml` in `release/`.
3. Copy the new `.exe` into `website/downloads/` (renamed to `Smart-Home-Inventory-Setup-latest.exe`).
4. Copy the new `.exe` **and** `latest.yml` into `website/updates/win/`.
5. Add an entry to the changelog section in `index.html`.
6. Re-deploy the site.

Existing installs will pick up the new version automatically next time someone clicks
"Check for updates" (or you can wire it to check on startup later).

## Placeholders still to fill in

- `index.html` → donate buttons (`REPLACE-WITH-YOUR-USERNAME` / `REPLACE-WITH-YOUR-ID`)
- `electron/main.js` → `UPDATE_FEED_URL`
- root `package.json` → `build.publish[0].url`
