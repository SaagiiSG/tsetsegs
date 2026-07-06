import { HelpCircle } from 'lucide-react';
import { useTour } from './TourProvider';
import { NewDot } from './NewDot';
import { findTourForRoute } from './tourSteps';
import { useLocation } from 'react-router-dom';

/**
 * Small ❓ button in the header — replays the tour for whatever /practice
 * page the student is on. Hidden if the current route has no tour.
 */
export function HelpButton() {
  const { startForCurrentRoute } = useTour();
  const { pathname } = useLocation();
  const tour = findTourForRoute(pathname);
  if (!tour) return null;

  return (
    <div className="relative">
      <button
        type="button"
        data-tour="help-button"
        onClick={() => startForCurrentRoute({ force: true })}
        aria-label="Replay page tour"
        title="Replay tour"
        className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      <NewDot featureId="help-button" />
    </div>
  );
}
