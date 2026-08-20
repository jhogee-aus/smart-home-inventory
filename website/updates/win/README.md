# Auto-update feed folder

This is what the app itself checks for new versions (via the "Check for updates" button
in the header). It's separate from the `downloads/` folder, which is only for the manual
website download button — electron-updater reads `latest.yml`, not the webpage.

Each release, copy both of these from the project's `release/` folder into this directory:

```
latest.yml
Smart Home Inventory Setup <version>.exe
```

`latest.yml` is generated automatically by `npm run dist` (electron-builder) and contains
the version number, filename, and checksum the app uses to detect and verify updates.

This folder's URL must exactly match `UPDATE_FEED_URL` in `electron/main.js` and the
`build.publish[0].url` in the root `package.json` — e.g. if this site is deployed at
`https://your-domain.com`, both should point to `https://your-domain.com/updates/win`.
