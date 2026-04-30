import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronsLeftRight, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'practice:hints:seen:v1';
const MAX_SHOWS = 3;

/**
 * iOS-style discoverability hints for swipe gestures.
 * Shown the first 3 visits per route, fades out after 3.5s.
 */
export function GestureHintOverlay() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!location.pathname.startsWith('/practice')) return;

    let counts: Record<string, number> = {};
    try {
      counts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      counts = {};
    }
    const key = location.pathname;
    const seen = counts[key] || 0;
    if (seen >= MAX_SHOWS) return;

    counts[key] = seen + 1;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
    } catch {
      /* ignore */
    }

    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, [location.pathname]);

  if (!visible) return null;

  const isQuestion = /\/practice\/(english\/)?question\//.test(location.pathname);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 md:bottom-10 z-40 flex justify-center px-4">
      <div
        className={cn(
          'pointer-events-none flex items-center gap-2 rounded-full bg-foreground/85 px-3 py-1.5 text-xs text-background backdrop-blur',
          'animate-in fade-in slide-in-from-bottom-2 duration-300',
          'motion-reduce:animate-none'
        )}
      >
        {isQuestion ? (
          <>
            <ChevronsLeftRight className="h-3.5 w-3.5" />
            <span>Swipe to change question</span>
            <span className="opacity-60">·</span>
            <ArrowUp className="h-3.5 w-3.5" />
            <span>swipe up for menu</span>
          </>
        ) : (
          <>
            <ArrowUp className="h-3.5 w-3.5" />
            <span>Swipe up or tap ✨ for quick menu</span>
          </>
        )}
      </div>
    </div>
  );
}
