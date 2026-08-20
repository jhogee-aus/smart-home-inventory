import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import GuidedTour from '../components/GuidedTour';

interface TourContextValue {
  openTour: () => void;
}

const TourContext = createContext<TourContextValue | undefined>(undefined);

const TOUR_SEEN_KEY = 'smi_tour_seen';

export function TourProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_SEEN_KEY)) {
      setOpen(true);
    }
  }, []);

  const close = () => {
    localStorage.setItem(TOUR_SEEN_KEY, '1');
    setOpen(false);
  };

  return (
    <TourContext.Provider value={{ openTour: () => setOpen(true) }}>
      {children}
      <GuidedTour isOpen={open} onClose={close} />
    </TourContext.Provider>
  );
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
