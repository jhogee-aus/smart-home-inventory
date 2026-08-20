export interface UpdateStatus {
  state: 'checking' | 'up-to-date' | 'available' | 'downloading' | 'ready' | 'error' | 'dev-mode';
  version?: string;
  percent?: number;
  message?: string;
}

export interface ElectronAPI {
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
