const { ipcMain } = require('electron');

// Registers one ipcMain.handle() per old HTTP route, 1:1, so the mapping in
// preload.js's contextBridge API stays mechanical to read against the old
// route list. Each handler just calls straight into the same controller
// functions the Express routes used to call.
function registerIpcHandlers(backendDir) {
  const homes = require(`${backendDir}/controllers/homesController`);
  const rooms = require(`${backendDir}/controllers/roomsController`);
  const zones = require(`${backendDir}/controllers/zonesController`);
  const items = require(`${backendDir}/controllers/itemsController`);
  const moveBoxes = require(`${backendDir}/controllers/movesController`);
  const search = require(`${backendDir}/controllers/searchController`);

  ipcMain.handle('homes:create', (event, name) => homes.createHome(name));
  ipcMain.handle('homes:list', () => homes.getHomes());
  ipcMain.handle('homes:delete', (event, homeId) => homes.deleteHome(homeId));

  ipcMain.handle('rooms:create', (event, homeId, body) => rooms.createRoom(homeId, body));
  ipcMain.handle('rooms:getByHome', (event, homeId) => rooms.getRoomsByHome(homeId));
  ipcMain.handle('rooms:getLayout', (event, homeId) => rooms.getRoomsWithZones(homeId));
  ipcMain.handle('rooms:updatePosition', (event, roomId, body) => rooms.updateRoomPosition(roomId, body));
  ipcMain.handle('rooms:updateSize', (event, roomId, body) => rooms.updateRoomSize(roomId, body));
  ipcMain.handle('rooms:delete', (event, roomId) => rooms.deleteRoom(roomId));

  ipcMain.handle('zones:create', (event, roomId, body) => zones.createZone(roomId, body));
  ipcMain.handle('zones:getByRoom', (event, roomId) => zones.getZonesByRoom(roomId));
  ipcMain.handle('zones:update', (event, zoneId, body) => zones.updateZone(zoneId, body));
  ipcMain.handle('zones:updatePosition', (event, zoneId, body) => zones.updateZonePosition(zoneId, body));
  ipcMain.handle('zones:delete', (event, zoneId) => zones.deleteZone(zoneId));

  ipcMain.handle('items:create', (event, zoneId, body) => items.createItem(zoneId, body));
  ipcMain.handle('items:getByZone', (event, zoneId) => items.getItemsByZone(zoneId));
  ipcMain.handle('items:update', (event, itemId, body) => items.updateItem(itemId, body));
  ipcMain.handle('items:pack', (event, itemId, body) => items.packItem(itemId, body));
  ipcMain.handle('items:unpack', (event, itemId, body) => items.unpackItem(itemId, body));
  ipcMain.handle('items:delete', (event, itemId) => items.deleteItem(itemId));

  ipcMain.handle('moveBoxes:create', (event, body) => moveBoxes.createBox(body));
  ipcMain.handle('moveBoxes:list', () => moveBoxes.getBoxes());
  ipcMain.handle('moveBoxes:complete', (event, boxId) => moveBoxes.completeBox(boxId));
  ipcMain.handle('moveBoxes:delete', (event, boxId) => moveBoxes.deleteBox(boxId));

  ipcMain.handle('search:items', (event, query) => search.searchItems(query));
}

module.exports = { registerIpcHandlers };
