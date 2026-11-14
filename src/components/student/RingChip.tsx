import { MiniRing, SKY_RING } from '@/portal/CenterStreak';

// max-md:!hidden: the unlayered .student-chip display (index.css) beats a plain `hidden`, and the main app shares that rule.
// The ✓ shows only once the all-three bonus is really paid (`allPaid`), not just when the client counts 3 closed rings.
export function RingChip({ p, closed, left, earned, allPaid, onClick, colors = SKY_RING }: { p: [number, number, number]; closed: number; left?: number; earned?: number; allPaid?: boolean; onClick?: () => void; colors?: { speed: string; hard: string; medium: string } }) {
  const won = closed === 3 && !!earned;
  const prize = closed === 3 ? (earned ? ` · +${earned}${allPaid ? ' ✓' : ''}` : '') : left ? ` · +${left}` : '';
  const said = won ? `, ${earned} points earned${allPaid ? ', all rings paid' : ''}` : closed < 3 && left ? `, ${left} points to win` : '';
  return (
    <button type="button" onClick={onClick} className="max-md:!hidden student-chip shrink-0" title="Daily rings" aria-label={`${closed} of 3 daily rings closed${said}`}>
      <MiniRing size={18} stroke={1.5} gap={1} p={p} colors={colors} />
      <span className="tabular-nums">{`${closed}/3`}{prize}</span>
    </button>
  );
}
