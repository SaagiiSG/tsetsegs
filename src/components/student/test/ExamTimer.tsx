import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/**
 * Self-contained countdown. Owns its own tick state so the exam screen
 * (passage, question, choices, question grid) never re-renders on the clock.
 */
export function ExamTimer({
  endsAt,
  paused = false,
  onExpire,
}: {
  endsAt: number;
  /** Stop firing onExpire (e.g. already submitted). */
  paused?: boolean;
  onExpire?: () => void;
}) {
  const [remaining, setRemaining] = useState(() => Math.max(0, Math.floor((endsAt - Date.now()) / 1000)));
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
  }, [endsAt]);

  useEffect(() => {
    const tick = () => {
      const r = Math.max(0, Math.floor((endsAt - Date.now()) / 1000));
      setRemaining((prev) => (prev === r ? prev : r));
      if (r === 0 && !paused && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt, paused]);

  const tone = remaining <= 60 ? 'text-destructive' : remaining <= 300 ? 'text-amber-500' : 'text-muted-foreground';

  return <div className={cn('font-mono text-sm tabular-nums', tone)}>{fmt(remaining)}</div>;
}
