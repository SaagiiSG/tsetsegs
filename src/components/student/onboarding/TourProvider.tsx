import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TOUR_RELEASE, TourDefinition, findTourForRoute } from './tourSteps';

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
}

const TourContext = createContext<TourContextValue | null>(null);

function seenKey(tourKey: string) {
  return `practice:tour:${TOUR_RELEASE}:${tourKey}`;
}
function featureKey(featureId: string) {
  return `practice:new:${TOUR_RELEASE}:${featureId}`;
}

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

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [activeTour, setActiveTour] = useState<TourDefinition | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [ackTick, setAckTick] = useState(0); // re-render bump when features are acked
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
    if (!opts?.force && isSeen(tour.key)) return;
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

  // Auto-start once per route per release.
  useEffect(() => {
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
  }, [pathname]);

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
  }), [activeTour, stepIndex, start, next, back, end, startForCurrentRoute, seenForCurrentRoute, acknowledgeFeature, isFeatureAcknowledged]);

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error('useTour must be used within TourProvider');
  return ctx;
}
