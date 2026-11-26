# Smart Home Inventory - Agent Notes

## Never delete or reset the database

Never delete, overwrite, or reset any `.db` file in this repo (especially
`backend/database.db`), even to "clean up test data." That file is
git-ignored with no backup, and it holds the user's real, hand-entered
inventory data. If you need test data, copy the database to a temporary
file first and work only on the copy, or use the app's own API to create
and then delete specific test records (e.g. a scoped `homes.delete(id)`
call), never a blanket file wipe or raw `DELETE` across the whole table.

## No HTTP layer

This app has no HTTP server. All data access goes through Electron IPC
(`contextBridge` in `electron/preload.js` + `ipcMain.handle` in
`electron/ipc.js`), called from the renderer as `window.api.*`. Never add
Express, `fetch`/`axios` calls to `localhost`, or any HTTP listener -
if a new read/write operation is needed, add it as an IPC channel
following the existing `homes` / `rooms` / `zones` / `items` pattern, not
as a REST endpoint.
