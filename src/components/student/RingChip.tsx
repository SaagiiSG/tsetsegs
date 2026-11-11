import { MiniRing, SKY_RING } from '@/portal/CenterStreak';

// max-md:!hidden: the unlayered .student-chip display (index.css) beats a plain `hidden`, and the main app shares that rule.
export function RingChip({ p, closed, left, earned, onClick, colors = SKY_RING }: { p: [number, number, number]; closed: number; left?: number; earned?: number; onClick?: () => void; colors?: { speed: string; hard: string; medium: string } }) {
  return (
    <button type="button" onClick={onClick} className="max-md:!hidden student-chip shrink-0" title="Daily rings" aria-label={`${closed} of 3 daily rings closed`}>
      <MiniRing size={18} stroke={1.5} gap={1} p={p} colors={colors} />
      <span className="tabular-nums">{`${closed}/3`}{closed === 3 ? (earned ? ` · +${earned} ✓` : '') : left ? ` · +${left}` : ''}</span>
    </button>
  );
}
