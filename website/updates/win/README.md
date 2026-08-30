# Auto-update feed folder

No longer used. The app's "Check for updates" button now reads update info directly
from **GitHub Releases** (via `electron-updater`'s built-in `github` provider), not from
this website.

This works because `npm run dist` embeds an `app-update.yml` into the packaged app,
generated from the `build.publish` block in the root `package.json`:

```json
"publish": [{ "provider": "github", "owner": "jhogee-aus", "repo": "smart-home-inventory" }]
```

To ship an update: bump `version` in `package.json`, run `npm run dist`, and publish a
new GitHub Release with the resulting `.exe`, `.blockmap`, and `latest.yml` from `release/`
attached as assets. Existing installs pick it up next time someone clicks "Check for
updates".
