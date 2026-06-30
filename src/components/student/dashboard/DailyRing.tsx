import { motion } from 'framer-motion';
import { Settings2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DailyRingProps {
  speed: { current: number; goal: number };
  hard: { current: number; goal: number };
  medium: { current: number; goal: number };
  onEditGoals?: () => void;
  onShowHistory?: () => void;
  size?: number;
}

const RING_COLORS = {
  speed: 'hsl(45, 95%, 55%)',    // yellow (outer)
  hard: 'hsl(0, 84%, 60%)',      // coral/red (middle)
  medium: 'hsl(180, 85%, 45%)',  // teal (inner)
};

function Ring({
  cx, cy, radius, stroke, color, pct,
}: { cx: number; cy: number; radius: number; stroke: number; color: string; pct: number }) {
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(1, pct) * circumference);
  return (
    <g>
      {/* track */}
      <circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeOpacity={0.18}
        strokeWidth={stroke}
      />
      {/* progress */}
      <motion.circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${circumference} ${circumference}`}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - dash }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: pct >= 1 ? `drop-shadow(0 0 6px ${color})` : undefined }}
      />
    </g>
  );
}

export function DailyRing({ speed, hard, medium, onEditGoals, onShowHistory, size = 220 }: DailyRingProps) {
  const cx = size / 2;
  const cy = size / 2;
  const stroke = Math.round(size * 0.085);
  const gap = Math.round(stroke * 0.45);
  const rOuter = (size / 2) - stroke / 2 - 2;
  const rMid = rOuter - stroke - gap;
  const rInner = rMid - stroke - gap;

  const speedPct = speed.goal > 0 ? speed.current / speed.goal : 0;
  const hardPct = hard.goal > 0 ? hard.current / hard.goal : 0;
  const medPct = medium.goal > 0 ? medium.current / medium.goal : 0;

  const allDone = speedPct >= 1 && hardPct >= 1 && medPct >= 1;

  return (
    <Card
      className={cn(
        'h-full relative overflow-hidden',
        onShowHistory && 'cursor-pointer transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      onClick={onShowHistory ? () => onShowHistory() : undefined}
      role={onShowHistory ? 'button' : undefined}
      tabIndex={onShowHistory ? 0 : undefined}
      onKeyDown={onShowHistory ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onShowHistory(); } } : undefined}
      aria-label={onShowHistory ? 'View streak history' : undefined}
    >
      {onEditGoals && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onEditGoals}
          className="absolute top-2 right-2 h-8 w-8 z-10 text-muted-foreground hover:text-foreground"
          aria-label="Edit daily goals"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      )}
      <CardContent className="p-3 sm:p-4 h-full flex flex-col items-center justify-between gap-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground self-start">
          Today's Goal
        </div>
        <div className="flex-1 flex items-center justify-center">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Ring cx={cx} cy={cy} radius={rOuter} stroke={stroke} color={RING_COLORS.speed} pct={speedPct} />
            <Ring cx={cx} cy={cy} radius={rMid} stroke={stroke} color={RING_COLORS.hard} pct={hardPct} />
            <Ring cx={cx} cy={cy} radius={rInner} stroke={stroke} color={RING_COLORS.medium} pct={medPct} />
            <text
              x={cx} y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-foreground font-mono"
              style={{ fontSize: size * 0.16, fontWeight: 700 }}
            >
              {Math.round(((speedPct + hardPct + medPct) / 3) * 100)}%
            </text>
            <text
              x={cx} y={cy + size * 0.12}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: size * 0.06 }}
            >
              {allDone ? 'Crushed it 🔥' : 'today'}
            </text>
          </svg>
        </div>
        <div className="w-full grid grid-cols-3 gap-1 text-[10px] sm:text-xs">
          <Legend label="Speed" current={speed.current} goal={speed.goal} color={RING_COLORS.speed} />
          <Legend label="Hard" current={hard.current} goal={hard.goal} color={RING_COLORS.hard} />
          <Legend label="Medium" current={medium.current} goal={medium.goal} color={RING_COLORS.medium} />
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const done = current >= goal;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full" style={{ background: color }} />
        <span className="text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
      </div>
      <span className={cn('font-mono font-semibold', done ? 'text-foreground' : 'text-muted-foreground')}>
        {current}/{goal}
      </span>
    </div>
  );
}
