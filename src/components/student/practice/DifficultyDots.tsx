import { cn } from '@/lib/utils';

interface DifficultyDotsProps {
  level: string | null | undefined;
  className?: string;
  showLabel?: boolean;
}

const LEVEL_META: Record<string, { count: number; color: string; label: string }> = {
  easy:   { count: 1, color: 'bg-emerald-500', label: 'Easy' },
  medium: { count: 2, color: 'bg-amber-500',   label: 'Medium' },
  hard:   { count: 3, color: 'bg-red-500',     label: 'Hard' },
};

export function DifficultyDots({ level, className, showLabel = false }: DifficultyDotsProps) {
  if (!level) return null;
  const meta = LEVEL_META[level.toLowerCase()];
  if (!meta) return null;

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      title={`Difficulty: ${meta.label}`}
      aria-label={`Difficulty: ${meta.label}`}
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i < meta.count ? meta.color : 'bg-muted'
          )}
        />
      ))}
      {showLabel && (
        <span className="ml-1 text-xs font-medium text-muted-foreground">{meta.label}</span>
      )}
    </span>
  );
}
