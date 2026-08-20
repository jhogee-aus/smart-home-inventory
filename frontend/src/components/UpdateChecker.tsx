import { useEffect, useState } from 'react';
import type { UpdateStatus } from '../types/electron';

export default function UpdateChecker() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;
    return window.electronAPI.onUpdateStatus(setStatus);
  }, []);

  if (!window.electronAPI) return null;

  const checking = status?.state === 'checking';
  const downloading = status?.state === 'downloading';
  const ready = status?.state === 'ready';

  const label = (() => {
    switch (status?.state) {
      case 'checking':
        return 'Checking…';
      case 'up-to-date':
        return 'Up to date';
      case 'available':
        return `Downloading v${status.version}…`;
      case 'downloading':
        return `Downloading… ${status.percent ?? 0}%`;
      case 'ready':
        return `Restart to update (v${status.version})`;
      case 'error':
        return 'Update check failed';
      case 'dev-mode':
        return 'Updates disabled in dev mode';
      default:
        return 'Check for updates';
    }
  })();

  const handleClick = () => {
    if (ready) {
      window.electronAPI?.installUpdate();
    } else {
      window.electronAPI?.checkForUpdates();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={checking || downloading}
      className="min-h-8 shrink-0 rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-indigo-600 disabled:cursor-wait disabled:opacity-70"
    >
      {label}
    </button>
  );
}
