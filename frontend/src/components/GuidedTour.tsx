import { useState } from 'react';

interface Step {
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    title: 'Welcome to Smart Home Inventory',
    body: 'Keep track of everything you own, room by room. Everything is stored locally on this computer — nothing is uploaded anywhere.',
  },
  {
    title: '1. Add a Home',
    body: 'On the Homes screen, click the dashed "+ Add Home" card and give it a name, like "Main House" or "Lake Cabin".',
  },
  {
    title: '2. Add Rooms',
    body: 'Open a home, then use the "Add a room" card to create rooms — Kitchen, Garage, Bedroom, whatever fits.',
  },
  {
    title: '3. Add Zones',
    body: 'Inside each room, add zones — shelves, drawers, boxes, cabinets. Drag zones around the visual layout to match the real room.',
  },
  {
    title: '4. Add Items',
    body: 'Click a zone in the layout to open its detail panel, then add the items stored there.',
  },
  {
    title: '5. Find Anything Fast',
    body: 'Use the search bar on the Rooms screen to find an item instantly — it shows exactly which room and zone it’s in.',
  },
  {
    title: 'You’re all set',
    body: 'Replay this tour anytime from the "?" button in the top bar.',
  },
];

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuidedTour({ isOpen, onClose }: GuidedTourProps) {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const isFirst = step === 0;
  const isLast = step === steps.length - 1;
  const current = steps[step];

  const handleClose = () => {
    setStep(0);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-indigo-500">
            Step {step + 1} of {steps.length}
          </span>
          <button
            onClick={handleClose}
            aria-label="Close tour"
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <h2 className="text-lg font-semibold text-slate-900">{current.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{current.body}</p>

        <div className="mt-6 flex items-center justify-between gap-2">
          <div className="flex gap-1">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === step ? 'bg-indigo-600' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="min-h-9 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={handleClose}
                className="min-h-9 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Got it
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="min-h-9 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Next
              </button>
            )}
          </div>
        </div>

        {!isLast && (
          <button
            onClick={handleClose}
            className="mt-3 w-full text-center text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            Skip tour
          </button>
        )}
      </div>
    </div>
  );
}
