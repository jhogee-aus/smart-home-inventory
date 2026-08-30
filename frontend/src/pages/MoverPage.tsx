import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import ZonePicker from '../components/ZonePicker';
import ConfirmDialog from '../components/ConfirmDialog';

interface BoxItem {
  id: number;
  name: string;
  quantity: number;
  description?: string;
}

interface Box {
  id: number;
  name: string;
  status: 'packing' | 'completed';
  created_at: string;
  completed_at: string | null;
  items: BoxItem[];
}

function UnpackRow({ item, onUnpack }: { item: BoxItem; onUnpack: (itemId: number, zoneId: number) => void }) {
  const [open, setOpen] = useState(false);
  const [zoneId, setZoneId] = useState<number | null>(null);

  return (
    <li className="py-2">
      <div className="flex items-center gap-2">
        <span className="flex-1 truncate text-sm text-slate-800">
          {item.name}
          {item.quantity > 1 && <span className="text-slate-400"> × {item.quantity}</span>}
        </span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="min-h-8 shrink-0 rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
        >
          {open ? 'Cancel' : 'Unpack…'}
        </button>
      </div>

      {open && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2">
          <ZonePicker onSelect={setZoneId} />
          <button
            onClick={() => {
              if (!zoneId) return;
              onUnpack(item.id, zoneId);
              setOpen(false);
            }}
            disabled={!zoneId}
            className="min-h-9 shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Move here
          </button>
        </div>
      )}
    </li>
  );
}

function MoverPage() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [loading, setLoading] = useState(true);

  const [newBoxName, setNewBoxName] = useState('');
  const [creating, setCreating] = useState(false);

  const [packBoxId, setPackBoxId] = useState<number | null>(null);
  const [packZoneId, setPackZoneId] = useState<number | null>(null);
  const [packZoneItems, setPackZoneItems] = useState<any[]>([]);
  const [checkedItemIds, setCheckedItemIds] = useState<Set<number>>(new Set());
  const [packing, setPacking] = useState(false);

  const [confirmDeleteBox, setConfirmDeleteBox] = useState<Box | null>(null);
  const [deleteBoxError, setDeleteBoxError] = useState<string | null>(null);

  const fetchBoxes = () => {
    API.get('/move-boxes')
      .then((res) => setBoxes(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBoxes();
  }, []);

  const createBox = async () => {
    if (!newBoxName.trim()) return;

    setCreating(true);
    try {
      await API.post('/move-boxes', { name: newBoxName });
      setNewBoxName('');
      fetchBoxes();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const completeBox = async (boxId: number) => {
    try {
      await API.put(`/move-boxes/${boxId}/complete`);
      fetchBoxes();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteBox = async (box: Box) => {
    try {
      await API.delete(`/move-boxes/${box.id}`);
      setConfirmDeleteBox(null);
      setDeleteBoxError(null);
      fetchBoxes();
    } catch (err: any) {
      setDeleteBoxError(
        err?.response?.data?.error || 'Could not delete this box.'
      );
    }
  };

  const openPackPicker = (boxId: number) => {
    setPackBoxId(boxId);
    setPackZoneId(null);
    setPackZoneItems([]);
    setCheckedItemIds(new Set());
  };

  const closePackPicker = () => {
    setPackBoxId(null);
    setPackZoneId(null);
    setPackZoneItems([]);
    setCheckedItemIds(new Set());
  };

  const onPackZoneSelected = async (zoneId: number | null) => {
    setPackZoneId(zoneId);
    setCheckedItemIds(new Set());

    if (!zoneId) {
      setPackZoneItems([]);
      return;
    }

    try {
      const res = await API.get(`/items/${zoneId}`);
      setPackZoneItems(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const toggleChecked = (itemId: number) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const packSelectedItems = async () => {
    if (!packBoxId || checkedItemIds.size === 0) return;

    setPacking(true);
    try {
      await Promise.all(
        Array.from(checkedItemIds).map((itemId) =>
          API.put(`/items/${itemId}/pack`, { box_id: packBoxId })
        )
      );

      if (packZoneId) {
        const res = await API.get(`/items/${packZoneId}`);
        setPackZoneItems(res.data);
      }

      setCheckedItemIds(new Set());
      fetchBoxes();
    } catch (err) {
      console.error(err);
    } finally {
      setPacking(false);
    }
  };

  const unpackItem = async (itemId: number, zoneId: number) => {
    try {
      await API.put(`/items/${itemId}/unpack`, { zone_id: zoneId });
      fetchBoxes();
    } catch (err) {
      console.error(err);
    }
  };

  const packingBoxes = boxes.filter((b) => b.status === 'packing');
  const completedBoxes = boxes.filter((b) => b.status === 'completed');

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

      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mover</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pack items into boxes when you're moving, then unpack them into a zone in your new home whenever you're ready.
        </p>
      </div>

      <div className="mb-8 flex gap-2">
        <input
          type="text"
          placeholder="New box name (e.g. Kitchen box 1)"
          value={newBoxName}
          onChange={(e) => setNewBoxName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createBox()}
          className="min-h-11 w-full max-w-sm rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          onClick={createBox}
          disabled={creating || !newBoxName.trim()}
          className="min-h-11 shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {creating ? 'Adding…' : '+ New box'}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Packing</h2>

            {packingBoxes.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
                No boxes yet — create one above to start packing.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {packingBoxes.map((box) => (
                  <div key={box.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-medium text-slate-900">{box.name}</h3>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        Packing
                      </span>
                    </div>

                    <p className="mb-3 text-xs text-slate-500">
                      {box.items.length} item{box.items.length === 1 ? '' : 's'}
                    </p>

                    {box.items.length > 0 && (
                      <ul className="mb-3 max-h-40 divide-y divide-slate-100 overflow-y-auto">
                        {box.items.map((item) => (
                          <UnpackRow key={item.id} item={item} onUnpack={unpackItem} />
                        ))}
                      </ul>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => openPackPicker(box.id)}
                        className="min-h-9 flex-1 rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                      >
                        Add items
                      </button>
                      <button
                        onClick={() => completeBox(box.id)}
                        className="min-h-9 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Complete
                      </button>
                      <button
                        onClick={() => {
                          setDeleteBoxError(null);
                          setConfirmDeleteBox(box);
                        }}
                        className="min-h-9 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Completed moves</h2>

            {completedBoxes.length === 0 ? (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
                Boxes you mark complete are kept here as a record.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {completedBoxes.map((box) => (
                  <div key={box.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-medium text-slate-900">{box.name}</h3>
                      <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                        Completed
                      </span>
                    </div>

                    <p className="mb-3 text-xs text-slate-500">
                      {box.items.length} item{box.items.length === 1 ? '' : 's'} remaining to unpack
                    </p>

                    {box.items.length > 0 ? (
                      <ul className="mb-3 max-h-40 divide-y divide-slate-100 overflow-y-auto">
                        {box.items.map((item) => (
                          <UnpackRow key={item.id} item={item} onUnpack={unpackItem} />
                        ))}
                      </ul>
                    ) : (
                      <p className="mb-3 rounded-lg border border-dashed border-slate-200 py-4 text-center text-xs text-slate-400">
                        Fully unpacked
                      </p>
                    )}

                    <button
                      onClick={() => {
                        setDeleteBoxError(null);
                        setConfirmDeleteBox(box);
                      }}
                      className="min-h-9 w-full rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ADD ITEMS PANEL */}
      {packBoxId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={closePackPicker}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-semibold text-slate-900">Add items to box</h2>
            <p className="mb-4 text-sm text-slate-500">Pick a zone, then check off the items to pack.</p>

            <ZonePicker onSelect={onPackZoneSelected} />

            <div className="mt-4">
              {!packZoneId ? (
                <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                  Choose a zone above to see its items.
                </p>
              ) : packZoneItems.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                  This zone has no items to pack.
                </p>
              ) : (
                <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                  {packZoneItems.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checkedItemIds.has(item.id)}
                        onChange={() => toggleChecked(item.id)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="flex-1 truncate text-sm text-slate-800">
                        {item.name}
                        {item.quantity > 1 && <span className="text-slate-400"> × {item.quantity}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closePackPicker}
                className="min-h-9 rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Done
              </button>
              <button
                onClick={packSelectedItems}
                disabled={packing || checkedItemIds.size === 0}
                className="min-h-9 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {packing ? 'Packing…' : `Pack ${checkedItemIds.size || ''} item${checkedItemIds.size === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteBox !== null}
        title={`Delete "${confirmDeleteBox?.name}"?`}
        message={
          deleteBoxError ||
          'This removes the box record. It must be empty first — unpack any items before deleting.'
        }
        confirmLabel="Delete box"
        onConfirm={() => confirmDeleteBox && deleteBox(confirmDeleteBox)}
        onCancel={() => {
          setConfirmDeleteBox(null);
          setDeleteBoxError(null);
        }}
      />
    </div>
  );
}

export default MoverPage;
