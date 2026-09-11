const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('api', {
  homes: {
    create: invoke('homes:create'),
    list: invoke('homes:list'),
    delete: invoke('homes:delete'),
  },
  rooms: {
    create: invoke('rooms:create'),
    getByHome: invoke('rooms:getByHome'),
    getLayout: invoke('rooms:getLayout'),
    updatePosition: invoke('rooms:updatePosition'),
    updateSize: invoke('rooms:updateSize'),
    delete: invoke('rooms:delete'),
  },
  zones: {
    create: invoke('zones:create'),
    getByRoom: invoke('zones:getByRoom'),
    update: invoke('zones:update'),
    updatePosition: invoke('zones:updatePosition'),
    delete: invoke('zones:delete'),
  },
  items: {
    create: invoke('items:create'),
    getByZone: invoke('items:getByZone'),
    update: invoke('items:update'),
    pack: invoke('items:pack'),
    unpack: invoke('items:unpack'),
    delete: invoke('items:delete'),
  },
  moveBoxes: {
    create: invoke('moveBoxes:create'),
    list: invoke('moveBoxes:list'),
    complete: invoke('moveBoxes:complete'),
    delete: invoke('moveBoxes:delete'),
  },
  search: {
    items: invoke('search:items'),
  },
});

contextBridge.exposeInMainWorld('electronAPI', {
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback) => {
    const handler = (_event, status) => callback(status);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  },
});
