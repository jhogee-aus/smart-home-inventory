# Downloads folder

Put the current release installer here, named exactly:

```
Smart-Home-Inventory-Setup-latest.exe
```

The homepage's download button links to that fixed filename, so each new release just
overwrites this file — no HTML changes needed. The real build comes from:

```
release/Smart Home Inventory Setup <version>.exe
```

(produced by `npm run dist` at the project root — see the main project README).

## Heads-up: file size

The installer is currently ~100 MB. Many shared-hosting plans have small per-file upload
limits, and GitHub itself hard-blocks files over 100 MB. If your web host can't take a file
this size, host the `.exe` on **GitHub Releases** instead (free, built for exactly this) and
point this download button at the Release asset URL rather than this folder.
