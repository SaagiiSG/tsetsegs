import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SetCounts } from '@/hooks/useSetProgress';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  s68: SetCounts;
  s150: SetCounts;
  cb: SetCounts;
}

const COLORS = {
  cb: 'hsl(231, 80%, 60%)',
  s150: 'hsl(0, 84%, 60%)',
  s68: 'hsl(180, 85%, 45%)',
};

function Ring({
  cx, cy, radius, stroke, color, pct,
}: { cx: number; cy: number; radius: number; stroke: number; color: string; pct: number }) {
  const c = 2 * Math.PI * radius;
  return (
    <g>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={stroke} />
      <motion.circle
        cx={cx} cy={cy} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${c} ${c}`}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - Math.min(1, pct) * c }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ filter: pct >= 1 ? `drop-shadow(0 0 8px ${color})` : undefined }}
      />
    </g>
  );
}

export function BigCompletionRingDialog({ open, onOpenChange, s68, s150, cb }: Props) {
  const size = 340;
  const cx = size / 2;
  const cy = size / 2;
  const stroke = 28;
  const gap = 10;
  const rOuter = size / 2 - stroke / 2 - 4;
  const rMid = rOuter - stroke - gap;
  const rInner = rMid - stroke - gap;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Lifetime mastery</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Ring cx={cx} cy={cy} radius={rOuter} stroke={stroke} color={COLORS.cb} pct={cb.pct / 100} />
            <Ring cx={cx} cy={cy} radius={rMid} stroke={stroke} color={COLORS.s150} pct={s150.pct / 100} />
            <Ring cx={cx} cy={cy} radius={rInner} stroke={stroke} color={COLORS.s68} pct={s68.pct / 100} />
          </svg>
          <div className="grid grid-cols-3 gap-4 w-full">
            <Stat label="68" color={COLORS.s68} counts={s68} />
            <Stat label="150 Hard" color={COLORS.s150} counts={s150} />
            <Stat label="CB 1074" color={COLORS.cb} counts={cb} />
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Distinct questions answered correctly out of each set.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, color, counts }: { label: string; color: string; counts: SetCounts }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
        <span className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">{label}</span>
      </div>
      <div className="font-mono font-bold text-lg">{counts.pct}%</div>
      <div className="text-[10px] text-muted-foreground font-mono">{counts.completed}/{counts.total}</div>
    </div>
  );
}
