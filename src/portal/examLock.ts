import { createContext, useContext, useEffect, useId } from 'react';

/** Who currently asks for the exam lock. A Set keyed by caller, so unmount order can never leave it stuck. */
export const withLock = (held: ReadonlySet<string>, id: string, on: boolean): ReadonlySet<string> => {
  if (held.has(id) === on) return held;
  const next = new Set(held); if (on) next.add(id); else next.delete(id);
  return next;
};

export const ExamLockContext = createContext<(id: string, on: boolean) => void>(() => {});

/** While `on`, the portal shell hides its rail, dock and top bar. */
export function useExamLock(on: boolean) {
  const setLock = useContext(ExamLockContext), id = useId();
  useEffect(() => { if (!on) return; setLock(id, true); return () => setLock(id, false); }, [on, id, setLock]);
}
