// Data layer runs over Electron IPC (see electron/preload.js + electron/ipc.js),
// not HTTP - window.api is a typed contextBridge surface, not an axios instance.
// See src/types/api.d.ts for the full shape.
const API = window.api;

export default API;

// When a main-process IPC handler throws, ipcRenderer.invoke() rejects with an
// Error whose message Electron prefixes with
// "Error invoking remote method '<channel>': Error: <original message>"
// (plus a stack trace on later lines). This strips that wrapper so UI code
// can show the original validation message (e.g. "Unpack or remove all items
// from this box before deleting it") instead of the raw IPC plumbing text.
export function getErrorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  const raw = String((err as any)?.message ?? err ?? '').split('\n')[0];
  const match = raw.match(/Error invoking remote method '[^']*':\s*(?:Error:\s*)?(.+)$/);
  return (match ? match[1] : raw) || fallback;
}
