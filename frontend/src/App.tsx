import { Routes, Route, Link } from 'react-router-dom';

import HomePage from './pages/HomePage';
import RoomsPage from './pages/RoomsPage';
import MoverPage from './pages/MoverPage';
import { TourProvider, useTour } from './context/TourContext';
import UpdateChecker from './components/UpdateChecker';

function Header() {
  const { openTour } = useTour();

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
              <path d="M9 21v-6h6v6" />
            </svg>
          </span>
          <span className="truncate text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            Smart Home Inventory
          </span>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/mover"
            className="flex h-8 items-center gap-1.5 rounded-full border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
              <path d="M3.3 7 12 12l8.7-5" />
              <path d="M12 22V12" />
            </svg>
            Mover
          </Link>
          <UpdateChecker />
          <button
            onClick={openTour}
            aria-label="Show guided tour"
            title="Show guided tour"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-indigo-600"
          >
            ?
          </button>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <TourProvider>
      <div className="min-h-screen bg-slate-50">
        <Header />

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/homes/:homeId" element={<RoomsPage />} />
            <Route path="/mover" element={<MoverPage />} />
          </Routes>
        </main>
      </div>
    </TourProvider>
  );
}

export default App;
