import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { usePracticeCommandSheet } from './PracticeCommandSheetContext';
import { useHaptics } from '@/hooks/useHaptics';
import { cn } from '@/lib/utils';

interface Props {
  /** When `inline`, no fixed positioning — used inside the bottom nav center slot. */
  inline?: boolean;
}

/**
 * Quick-access FAB. Tap = open Command Sheet.
 * Pulses for the first few visits to teach discoverability.
 */
export function PracticeQuickFab({ inline = false }: Props) {
  const { toggle } = usePracticeCommandSheet();
  const haptics = useHaptics();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    try {
      const seen = parseInt(localStorage.getItem('practice:fab:seen') || '0', 10);
      if (seen < 3) {
        setPulse(true);
        localStorage.setItem('practice:fab:seen', String(seen + 1));
        const t = window.setTimeout(() => setPulse(false), 4000);
        return () => clearTimeout(t);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const onClick = () => {
    haptics('medium');
    setPulse(false);
    toggle();
  };

  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open quick actions"
      className={cn(
        'relative flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95',
        inline ? 'h-12 w-12 -mt-6 ring-4 ring-background' : 'h-14 w-14'
      )}
    >
      {pulse && (
        <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping motion-reduce:hidden" />
      )}
      <Sparkles className="h-5 w-5" />
    </button>
  );

  if (inline) return button;

  return (
    <div className="hidden md:block fixed bottom-6 right-6 z-50">
      {button}
    </div>
  );
}
