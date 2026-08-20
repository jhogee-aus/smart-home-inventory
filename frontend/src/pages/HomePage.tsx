import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import ConfirmDialog from '../components/ConfirmDialog';

interface Home {
  id: number;
  name: string;
}

function HomePage() {
  const [homes, setHomes] = useState<Home[]>([]);
  const [newHome, setNewHome] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmHome, setConfirmHome] = useState<Home | null>(null);

  const navigate = useNavigate();

  const fetchHomes = () => {
    API.get('/homes')
      .then(res => setHomes(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHomes();
  }, []);

  const createHome = async () => {
    if (!newHome.trim()) return;

    setCreating(true);
    try {
      await API.post('/homes', {
        name: newHome,
      });

      setNewHome('');
      setIsAdding(false);
      fetchHomes();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setNewHome('');
  };

  const requestDeleteHome = (e: React.MouseEvent, home: Home) => {
    e.stopPropagation();
    setConfirmHome(home);
  };

  const confirmDeleteHome = async () => {
    if (!confirmHome) return;
    const home = confirmHome;
    setConfirmHome(null);

    setDeletingId(home.id);
    try {
      await API.delete(`/homes/${home.id}`);
      setHomes(prev => prev.filter(h => h.id !== home.id));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Homes</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pick a home to manage its rooms, zones, and items.
        </p>
      </div>

      {/* homes list */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {homes.map(home => (
            <button
              key={home.id}
              onClick={() => navigate(`/homes/${home.id}`)}
              disabled={deletingId === home.id}
              className="group relative flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                    <path d="M3 10.5 12 3l9 7.5" />
                    <path d="M5 9.5V21h14V9.5" />
                    <path d="M9 21v-6h6v6" />
                  </svg>
                </span>
                <span className="font-medium text-slate-900">{home.name}</span>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <span
                  role="button"
                  aria-label={`Delete ${home.name}`}
                  onClick={(e) => requestDeleteHome(e, home)}
                  className="rounded-md p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                </span>

                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          ))}

          {isAdding ? (
            <div className="flex flex-col justify-center gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <input
                autoFocus
                type="text"
                placeholder="New home name (e.g. Lake House)"
                value={newHome}
                onChange={(e) => setNewHome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createHome();
                  if (e.key === 'Escape') cancelAdding();
                }}
                className="min-h-10 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              <div className="flex gap-2">
                <button
                  onClick={createHome}
                  disabled={creating || !newHome.trim()}
                  className="min-h-9 flex-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {creating ? 'Adding…' : 'Add'}
                </button>
                <button
                  onClick={cancelAdding}
                  disabled={creating}
                  className="min-h-9 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-5 text-slate-500 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              <span className="text-sm font-medium">Add Home</span>
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmHome !== null}
        title={`Delete "${confirmHome?.name}"?`}
        message="This will permanently remove its rooms, zones, and items. This cannot be undone."
        confirmLabel="Delete home"
        onConfirm={confirmDeleteHome}
        onCancel={() => setConfirmHome(null)}
      />
    </div>
  );
}

export default HomePage;
