import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import API from '../services/api';
import RoomCanvas from '../components/RoomCanvas';
import ConfirmDialog from '../components/ConfirmDialog';

interface Zone {
  id: number;
  name: string;
  type: string;
  width: number;
  height: number;
  pos_x: number;
  pos_y: number;
}

interface Room {
  id: number;
  name: string;
  width: number;
  height: number;
  zones: Zone[];
}

function RoomsPage() {

  const { homeId } = useParams();

  const [rooms, setRooms] = useState<Room[]>([]);

  const [loadingRooms, setLoadingRooms] = useState(true);

  const [newRoom, setNewRoom] = useState('');

  const [editingZone, setEditingZone] = useState(false);

  const [editZoneName, setEditZoneName] = useState('');

  const [items, setItems] = useState<any[]>([]);

  const [editingItemId, setEditingItemId] = useState<number | null>(null);

  const [editItemName, setEditItemName] = useState('');

  const [newItem, setNewItem] = useState('');

  const [selectedZone, setSelectedZone] =
  useState<any>(null);

  const [zoneInputs, setZoneInputs] = useState<{
    [roomId: number]: string;
  }>({});

  const [searchTerm, setSearchTerm] = useState('');

  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [searched, setSearched] = useState(false);

  const [highlightedZoneId, setHighlightedZoneId] = useState<number | null>(null);

  const [confirmTarget, setConfirmTarget] = useState<
    { type: 'room' | 'zone'; id: number; name: string } | null
  >(null);

  // FETCH ROOMS + ZONES
  const fetchRooms = async () => {

    try {

      const res = await API.get(
        `/rooms/layout/${homeId}`
      );

      const rows = res.data;

      const roomMap: any = {};

      rows.forEach((row: any) => {

        // create room once
        if (!roomMap[row.room_id]) {

          roomMap[row.room_id] = {
            id: row.room_id,
            name: row.room_name,
            width: row.room_width,
            height: row.room_height,
            zones: [],
          };
        }

        // push zone
        if (row.zone_id) {

          roomMap[row.room_id].zones.push({
            id: row.zone_id,
            name: row.zone_name,
            type: row.zone_type,
            width: row.zone_width,
            height: row.zone_height,
            pos_x: row.pos_x,
            pos_y: row.pos_y,
          });
        }
      });

      setRooms(Object.values(roomMap));

    } catch (err) {

      console.error(err);

    } finally {

      setLoadingRooms(false);
    }
  };

  const fetchItems = async () => {

    if (!selectedZone) return;

    try {

      const res = await API.get(
        `/items/${selectedZone.id}`
      );

      setItems(res.data);

    } catch (err) {

      console.error(err);
    }
  };

  useEffect(() => {

    fetchRooms();

  }, []);

  useEffect(() => {

    if (!selectedZone) return;

    fetchItems();

  }, [selectedZone]);

  // CREATE ROOM
  const createRoom = async () => {

    if (!newRoom.trim()) return;

    try {

      await API.post(`/rooms/${homeId}`, {
        name: newRoom,
        width: 500,
        height: 400,
      });

      setNewRoom('');

      fetchRooms();

    } catch (err) {

      console.error(err);
    }
  };


  // CREATE ZONE
  const createZone = async (roomId: number) => {

    const zoneName = zoneInputs[roomId];

    if (!zoneName?.trim()) return;

    try {

      await API.post(`/zones/${roomId}`, {
        name: zoneName,
        type: 'storage',
        width: 120,
        height: 60,
        pos_x: 40,
        pos_y: 80,
      });

      // clear input
      setZoneInputs(prev => ({
        ...prev,
        [roomId]: '',
      }));

      fetchRooms();

    } catch (err) {

      console.error(err);
    }
  };

  const deleteRoom = async (
    roomId: number
  ) => {

    try {

      await API.delete(
        `/rooms/${roomId}`
      );

      const deletedRoom = rooms.find(r => r.id === roomId);

      fetchRooms();

      if (
        deletedRoom?.zones.some(z => z.id === selectedZone?.id)
      ) {

        setSelectedZone(null);

        setItems([]);
      }

    } catch (err) {

      console.error(err);
    }
  };

  const deleteZone = async (
    zoneId: number
  ) => {

    try {

      await API.delete(
        `/zones/${zoneId}`
      );

      fetchRooms();

      if (
        selectedZone?.id === zoneId
      ) {

        setSelectedZone(null);

        setItems([]);
      }

    } catch (err) {

      console.error(err);
    }
  };

  const updateZone = async () => {

    if (!selectedZone) return;

    try {

      await API.put(
        `/zones/${selectedZone.id}`,
        {
          name: editZoneName,
          type: selectedZone.type,
        }
      );

      // update sidebar immediately
      setSelectedZone({
        ...selectedZone,
        name: editZoneName,
      });

      setEditingZone(false);

      fetchRooms();

    } catch (err) {

      console.error(err);
    }
  };

  const searchItems = async () => {

    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearched(false);
      return;
    }

    try {

      const res = await API.get(
        `/search?q=${encodeURIComponent(searchTerm)}`
      );

      setSearchResults(res.data.results);
      setSearched(true);

    } catch (err) {

      console.error(err);
    }
  };

  const selectSearchResult = (result: any) => {

    setHighlightedZoneId(
      result.zone_id
    );

    const room = rooms.find(
      r => r.id === result.room_id
    );

    const zone = room?.zones.find(
      z => z.id === result.zone_id
    );

    if (zone) {

      setSelectedZone({
        id: zone.id,
        name: zone.name,
        type: zone.type,
        width: zone.width,
        height: zone.height,
        roomId: room?.id,
      });
    }

    setSearchTerm('');
    setSearchResults([]);
    setSearched(false);

    // Remove highlight after 3 sec
    setTimeout(() => {

      setHighlightedZoneId(null);

    }, 3000);
  };

  const createItem = async () => {

    if (!selectedZone) return;

    if (!newItem.trim()) return;

    try {

      await API.post(
        `/items/${selectedZone.id}`,
        {
          name: newItem,
          description: '',
          quantity: 1,
        }
      );

      setNewItem('');

      fetchItems();

    } catch (err) {

      console.error(err);
    }
  };

  const updateItem = async (
    itemId: number
  ) => {

    try {

      await API.put(
        `/items/${itemId}`,
        {
          name: editItemName,
          quantity: 1,
        }
      );

      setEditingItemId(null);

      fetchItems();

    } catch (err) {

      console.error(err);
    }
  };

  const deleteItem = async (
    itemId: number
  ) => {

    try {

      await API.delete(
        `/items/${itemId}`
      );

      fetchItems();

    } catch (err) {

      console.error(err);
    }
  };

  return (
    <div>
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-indigo-600"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        All homes
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Rooms</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage rooms and zones, then click a zone to view its items.
          </p>
        </div>

        {/* SEARCH */}
        <div className="relative w-full sm:w-80">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Find an item…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchItems()}
                className="min-h-11 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <button
              onClick={searchItems}
              className="min-h-11 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Search
            </button>
          </div>

          {searched && (
            <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              {searchResults.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No items found.</p>
              ) : (
                <ul className="max-h-64 overflow-y-auto">
                  {searchResults.map(result => (
                    <li key={result.item_id}>
                      <button
                        onClick={() => selectSearchResult(result)}
                        className="flex w-full flex-col items-start rounded-md px-3 py-2 text-left text-sm hover:bg-indigo-50"
                      >
                        <span className="font-medium text-slate-900">{result.item_name}</span>
                        <span className="text-xs text-slate-500">
                          {result.room_name} / {result.zone_name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ROOM MANAGEMENT */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Rooms</h2>
        </div>

        {loadingRooms ? (
          <div className="flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 w-56 shrink-0 animate-pulse rounded-xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : (
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
            {rooms.map(room => (
              <div
                key={room.id}
                className="w-[85vw] shrink-0 snap-start rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:w-64"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-slate-900">{room.name}</h3>
                  <button
                    onClick={() => setConfirmTarget({ type: 'room', id: room.id, name: room.name })}
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {room.width} × {room.height} · {room.zones.length} zone{room.zones.length === 1 ? '' : 's'}
                </p>

                <div className="mt-3 flex gap-1.5">
                  <input
                    type="text"
                    placeholder="New zone"
                    value={zoneInputs[room.id] || ''}
                    onChange={(e) =>
                      setZoneInputs(prev => ({
                        ...prev,
                        [room.id]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => e.key === 'Enter' && createZone(room.id)}
                    className="min-h-10 w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    onClick={() => createZone(room.id)}
                    className="min-h-10 shrink-0 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    + Zone
                  </button>
                </div>
              </div>
            ))}

            {/* ADD ROOM CARD */}
            <div className="flex w-[85vw] shrink-0 snap-start flex-col justify-center rounded-xl border border-dashed border-slate-300 bg-white p-4 sm:w-64">
              <p className="mb-2 text-xs font-medium text-slate-500">Add a room</p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Room name"
                  value={newRoom}
                  onChange={(e) => setNewRoom(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createRoom()}
                  className="min-h-10 w-0 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-xs placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  onClick={createRoom}
                  className="min-h-10 shrink-0 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* CANVAS + ZONE DETAIL */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Visual Layout
          </h2>

          {rooms.length === 0 && !loadingRooms ? (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
              Add a room to see its layout here.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <RoomCanvas
                rooms={rooms}
                setRooms={setRooms}
                setSelectedZone={setSelectedZone}
                highlightedZoneId={highlightedZoneId}
              />
            </div>
          )}
        </div>

        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-96">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {!selectedZone ? (
              <div className="flex h-40 flex-col items-center justify-center text-center">
                <p className="text-sm text-slate-500">Click a zone in the layout to view its details and items.</p>
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-start justify-between gap-2">
                  {editingZone ? (
                    <div className="flex flex-1 gap-2">
                      <input
                        value={editZoneName}
                        onChange={(e) => setEditZoneName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && updateZone()}
                        className="min-h-9 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                        autoFocus
                      />
                      <button
                        onClick={updateZone}
                        className="min-h-9 shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-slate-900">{selectedZone.name}</h3>
                      <div className="flex shrink-0 gap-1.5">
                        <button
                          onClick={() => {
                            setEditingZone(true);
                            setEditZoneName(selectedZone.name);
                          }}
                          className="min-h-9 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            setConfirmTarget({ type: 'zone', id: selectedZone.id, name: selectedZone.name })
                          }
                          className="min-h-9 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <dl className="mb-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3 text-center">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate-400">Type</dt>
                    <dd className="text-sm font-medium text-slate-700">{selectedZone.type}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate-400">Width</dt>
                    <dd className="text-sm font-medium text-slate-700">{selectedZone.width}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-slate-400">Height</dt>
                    <dd className="text-sm font-medium text-slate-700">{selectedZone.height}</dd>
                  </div>
                </dl>

                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Items</h4>

                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Item name"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && createItem()}
                    className="min-h-10 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    onClick={createItem}
                    className="min-h-10 shrink-0 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    Add
                  </button>
                </div>

                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                    No items yet
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {items.map(item => (
                      <li key={item.id} className="flex items-center gap-2 py-2">
                        {editingItemId === item.id ? (
                          <>
                            <input
                              value={editItemName}
                              onChange={(e) => setEditItemName(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && updateItem(item.id)}
                              className="min-h-9 flex-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                              autoFocus
                            />
                            <button
                              onClick={() => updateItem(item.id)}
                              className="min-h-9 shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 truncate text-sm text-slate-800">{item.name}</span>
                            <button
                              onClick={() => {
                                setEditingItemId(item.id);
                                setEditItemName(item.name);
                              }}
                              className="min-h-9 shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
                            >
                              Edit
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="min-h-9 shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </aside>
      </section>

      <ConfirmDialog
        open={confirmTarget !== null}
        title={`Delete "${confirmTarget?.name}"?`}
        message={
          confirmTarget?.type === 'room'
            ? 'This removes all zones and items inside this room. This cannot be undone.'
            : 'This removes all items inside this zone. This cannot be undone.'
        }
        confirmLabel={confirmTarget?.type === 'room' ? 'Delete room' : 'Delete zone'}
        onConfirm={() => {
          if (!confirmTarget) return;
          if (confirmTarget.type === 'room') {
            deleteRoom(confirmTarget.id);
          } else {
            deleteZone(confirmTarget.id);
          }
          setConfirmTarget(null);
        }}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}

export default RoomsPage;
