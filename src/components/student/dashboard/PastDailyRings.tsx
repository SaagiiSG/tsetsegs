import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { useDailyGoals } from '@/hooks/useDailyGoals';
import { useDailyProgressHistory } from '@/hooks/useDailyProgressHistory';
import { format, parseISO, isToday } from 'date-fns';

const COLORS = {
  speed: 'hsl(45, 95%, 55%)',
  hard: 'hsl(0, 84%, 60%)',
  medium: 'hsl(180, 85%, 45%)',
};

interface MiniRingProps {
  size?: number;
  speedPct: number;
  hardPct: number;
  mediumPct: number;
}

function MiniRing({ size = 56, speedPct, hardPct, mediumPct }: MiniRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const stroke = Math.max(3, Math.round(size * 0.11));
  const gap = Math.max(1, Math.round(stroke * 0.35));
  const rOuter = size / 2 - stroke / 2 - 1;
  const rMid = rOuter - stroke - gap;
  const rInner = rMid - stroke - gap;

  const ring = (radius: number, color: string, pct: number) => {
    const c = 2 * Math.PI * radius;
    const dash = Math.min(1, pct) * c;
    return (
      <g>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c - dash}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </g>
    );
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {ring(rOuter, COLORS.speed, speedPct)}
      {rMid > 4 && ring(rMid, COLORS.hard, hardPct)}
      {rInner > 4 && ring(rInner, COLORS.medium, mediumPct)}
    </svg>
  );
}

export function PastDailyRings() {
  const { goals } = useDailyGoals();
  const { data: history, isLoading } = useDailyProgressHistory(30);

  if (isLoading) {
    return (
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 14 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const days = history ?? [];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Past 30 days
          </h3>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS.speed }} /> Speed
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS.hard }} /> Hard
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: COLORS.medium }} /> Medium
            </span>
          </div>
        </div>

        <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
          {days.map((d) => {
            const date = parseISO(d.date);
            const today = isToday(date);
            const sp = goals.speed > 0 ? d.speed / goals.speed : 0;
            const hp = goals.hard > 0 ? d.hard / goals.hard : 0;
            const mp = goals.medium > 0 ? d.medium / goals.medium : 0;
            const allDone = sp >= 1 && hp >= 1 && mp >= 1;
            const empty = d.speed === 0 && d.hard === 0 && d.medium === 0;

            return (
              <Tooltip key={d.date}>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      flex flex-col items-center gap-1 p-1.5 rounded-lg
                      ${today ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}
                      ${allDone ? 'bg-gradient-to-br from-orange-500/15 to-amber-500/10' : empty ? 'opacity-50' : ''}
                    `}
                  >
                    <MiniRing speedPct={sp} hardPct={hp} mediumPct={mp} />
                    <span className="text-[9px] font-mono text-muted-foreground leading-none">
                      {format(date, 'MMM d')}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-semibold mb-1">{format(date, 'EEE, MMM d')}</p>
                  <p><span style={{ color: COLORS.speed }}>●</span> Speed: {d.speed}/{goals.speed}</p>
                  <p><span style={{ color: COLORS.hard }}>●</span> Hard: {d.hard}/{goals.hard}</p>
                  <p><span style={{ color: COLORS.medium }}>●</span> Medium: {d.medium}/{goals.medium}</p>
                  {allDone && <p className="text-amber-500 font-semibold mt-1">All goals crushed 🔥</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
