# Smart Home Inventory — website

A single static page: hero + download, features, changelog, feedback, donate, contact.
No build step, no framework — just `index.html`, `css/style.css`, and `assets/`.

Deployed via Vercel, connected to the `jhogee-aus/smart-home-inventory` GitHub repo
(Root Directory: `website`, Framework Preset: Other, no build command). Every push to
`main` auto-redeploys.

## Releasing a new version

1. Bump `"version"` in the root `package.json`.
2. `npm run dist` — produces the installer, `.blockmap`, and `latest.yml` in `release/`.
3. Create a new GitHub Release on `jhogee-aus/smart-home-inventory` (tag e.g. `v1.0.1`)
   and attach all three files from `release/` as assets.
4. Add an entry to the changelog section in `index.html` and push — Vercel redeploys
   the site automatically.

The download button and in-app update check both point at GitHub Releases, so no file
copying into this folder is needed — see `downloads/README.md` and `updates/win/README.md`.

## Placeholders still to fill in

- `index.html` → donate buttons (`REPLACE-WITH-YOUR-USERNAME` / `REPLACE-WITH-YOUR-ID`)
