# Downloads folder

No longer used. The installer is hosted on **GitHub Releases** instead (it's ~100 MB,
over GitHub's regular repo file-size limit, and Releases is built for exactly this).

The homepage's download button links directly to:

```
https://github.com/jhogee-aus/smart-home-inventory/releases/latest/download/Smart-Home-Inventory-Setup.exe
```

That URL always resolves to the newest published release's asset, since `npm run dist`
produces a fixed filename (`Smart-Home-Inventory-Setup.exe`, see `nsis.artifactName` in
the root `package.json`) — no HTML changes needed between releases.

See the main project README for how to publish a release.
