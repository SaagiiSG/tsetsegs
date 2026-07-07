import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TOUR_RELEASE, TOURS, TourDefinition, findTourForRoute } from './tourSteps';

interface TourContextValue {
  activeTour: TourDefinition | null;
  stepIndex: number;
  start: (tour: TourDefinition, opts?: { force?: boolean }) => void;
  next: () => void;
  back: () => void;
  end: () => void;
  /** Start the tour that matches the current route (respects seen state unless forced). */
  startForCurrentRoute: (opts?: { force?: boolean }) => void;
  /** Whether the tour for the current route has already been seen this release. */
  seenForCurrentRoute: boolean;
  acknowledgeFeature: (featureId: string) => void;
  isFeatureAcknowledged: (featureId: string) => boolean;
  /** True once the student has finished all /practice tours for this release. */
  allToursCompleted: boolean;
  /** Persistently mark every tour as done — future auto-starts are suppressed. */
  markAllToursCompleted: () => void;
  /** Clear the completion flag + per-tour seen state (Help button can re-enable tours). */
  resetAllTours: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

function seenKey(tourKey: string) {
  return `practice:tour:${TOUR_RELEASE}:${tourKey}`;
}
function featureKey(featureId: string) {
  return `practice:new:${TOUR_RELEASE}:${featureId}`;
}
const COMPLETED_KEY = `practice:tour:${TOUR_RELEASE}:completed`;

function isSeen(tourKey: string) {
  try {
    return localStorage.getItem(seenKey(tourKey)) === '1';
  } catch {
    return false;
  }
}
function markSeen(tourKey: string) {
  try {
    localStorage.setItem(seenKey(tourKey), '1');
  } catch { /* noop */ }
}
function readCompleted() {
  try { return localStorage.getItem(COMPLETED_KEY) === '1'; } catch { return false; }
}
function writeCompleted(v: boolean) {
  try {
    if (v) localStorage.setItem(COMPLETED_KEY, '1');
    else localStorage.removeItem(COMPLETED_KEY);
  } catch { /* noop */ }
}
/** True when every registered tour has been seen at least once. */
function allTourKeysSeen() {
  return TOURS.every((t) => isSeen(t.key));
}

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [activeTour, setActiveTour] = useState<TourDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [ackTick, setAckTick] = useState(0); // re-render bump when features are acked
  const [allToursCompleted, setAllToursCompleted] = useState<boolean>(() => readCompleted());
  const autoStartedRef = useRef<Set<string>>(new Set());

  const acknowledgeFeature = useCallback((featureId: string) => {
    try {
      localStorage.setItem(featureKey(featureId), '1');
    } catch { /* noop */ }
    setAckTick((n) => n + 1);
  }, []);

  const isFeatureAcknowledged = useCallback((featureId: string) => {
    try {
      return localStorage.getItem(featureKey(featureId)) === '1';
    } catch {
      return true;
    }
    // ackTick intentionally referenced to invalidate memoized consumers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ackTick]);

  const start = useCallback((tour: TourDefinition, opts?: { force?: boolean }) => {
    if (!opts?.force && (isSeen(tour.key) || readCompleted())) return;
    setActiveTour(tour);
    setStepIndex(0);
  }, []);

  const end = useCallback(() => {
    if (activeTour) {
      markSeen(activeTour.key);
      // Ack all feature ids referenced in this tour so their NEW dots vanish.
      for (const s of activeTour.steps) {
        if (s.featureId) {
          try { localStorage.setItem(featureKey(s.featureId), '1'); } catch { /* noop */ }
        }
      }
      // Persist the global "done with onboarding" flag once every tour is seen.
      if (allTourKeysSeen()) {
        writeCompleted(true);
        setAllToursCompleted(true);
      }
    }
    setActiveTour(null);
    setStepIndex(0);
    setAckTick((n) => n + 1);
  }, [activeTour]);

  const next = useCallback(() => {
    if (!activeTour) return;
    const step = activeTour.steps[stepIndex];
    if (step?.featureId) acknowledgeFeature(step.featureId);
    if (stepIndex >= activeTour.steps.length - 1) {
      end();
    } else {
      setStepIndex((i) => i + 1);
    }
  }, [activeTour, stepIndex, acknowledgeFeature, end]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const startForCurrentRoute = useCallback((opts?: { force?: boolean }) => {
    const tour = findTourForRoute(pathname);
    if (tour) start(tour, opts);
  }, [pathname, start]);

  const seenForCurrentRoute = useMemo(() => {
    const tour = findTourForRoute(pathname);
    return tour ? isSeen(tour.key) : true;
  }, [pathname]);

  const markAllToursCompleted = useCallback(() => {
    for (const t of TOURS) markSeen(t.key);
    writeCompleted(true);
    setAllToursCompleted(true);
    setActiveTour(null);
    setStepIndex(0);
  }, []);

  const resetAllTours = useCallback(() => {
    try {
      for (const t of TOURS) localStorage.removeItem(seenKey(t.key));
      localStorage.removeItem(COMPLETED_KEY);
    } catch { /* noop */ }
    autoStartedRef.current.clear();
    setAllToursCompleted(false);
  }, []);

  // Auto-start once per route per release — suppressed once onboarding is completed.
  useEffect(() => {
    if (allToursCompleted) return;
    const tour = findTourForRoute(pathname);
    if (!tour) return;
    if (autoStartedRef.current.has(tour.key)) return;
    if (isSeen(tour.key)) return;
    // Small delay so the target elements are mounted.
    const t = window.setTimeout(() => {
      autoStartedRef.current.add(tour.key);
      setActiveTour(tour);
      setStepIndex(0);
    }, 600);
    return () => window.clearTimeout(t);
  }, [pathname, allToursCompleted]);

  const value = useMemo<TourContextValue>(() => ({
    activeTour,
    stepIndex,
    start,
    next,
    back,
    end,
    startForCurrentRoute,
    seenForCurrentRoute,
    acknowledgeFeature,
    isFeatureAcknowledged,
    allToursCompleted,
    markAllToursCompleted,
    resetAllTours,
  }), [activeTour, stepIndex, start, next, back, end, startForCurrentRoute, seenForCurrentRoute, acknowledgeFeature, isFeatureAcknowledged, allToursCompleted, markAllToursCompleted, resetAllTours]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
