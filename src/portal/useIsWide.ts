import { useEffect, useState } from 'react';

const QUERY = '(min-width: 1024px)';

/** Whether the screen is laptop-wide (Tailwind lg). null when it can't be known (a server render), which renders like a laptop. */
export function useIsWide(): boolean | null {
  const [wide, setWide] = useState<boolean | null>(() => (typeof window === 'undefined' || !window.matchMedia ? null : window.matchMedia(QUERY).matches));
  useEffect(() => {
    const m = window.matchMedia(QUERY), on = () => setWide(m.matches);
    on();
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return wide;
}
