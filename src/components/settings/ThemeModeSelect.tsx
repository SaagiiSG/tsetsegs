import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const MODES = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'system', label: 'System', icon: Monitor },
] as const;

/** Dark | Light | System appearance picker shared by main admin and center settings. */
export function ThemeModeSelect() {
  const { theme, setTheme } = useTheme();
  const current = theme ?? 'system';
  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="text-base font-medium">Theme</p>
        <p className="text-sm text-muted-foreground">System follows your device setting</p>
      </div>
      <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-lg border bg-muted/40 p-1 gap-1">
        {MODES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={current === id}
            onClick={() => setTheme(id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3 h-8 text-sm transition-colors',
              current === id ? 'bg-background shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>
    </div>
  );
}
