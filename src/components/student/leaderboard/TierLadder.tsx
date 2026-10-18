import { Lock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TIER_ORDER, TIER_COLORS, TIER_PROMOTION_CUTOFFS, type TierType } from '@/data/badgeDefinitions';
import { TIER_ASSETS } from './tierAssets';

export const ladderTierName = (t: string) => t === 'platinum' ? 'Emerald' : t.charAt(0).toUpperCase() + t.slice(1);

interface Props {
  currentTier: string;
  /** Earliest date each tier was reached (ISO). Current tier counts as unlocked. */
  unlockedAt: Partial<Record<string, string | null>>;
  /** Current standing in this sprint, if known. */
  standing?: number | null;
}

export function TierLadder({ currentTier, unlockedAt, standing }: Props) {
  const curIdx = Math.max(0, TIER_ORDER.indexOf(currentTier as TierType));
  const next = TIER_ORDER[curIdx + 1];
  const cutoff = TIER_PROMOTION_CUTOFFS[currentTier as TierType] ?? 10;
  const highestUnlocked = Math.max(curIdx, ...TIER_ORDER.map((t, i) => (t in unlockedAt ? i : -1)));

  const nextLine = !next
    ? 'Finish #1 in your group to keep Ruby.'
    : standing && standing <= cutoff
      ? `You're #${standing} — inside the top ${cutoff}. Hold it to reach ${ladderTierName(next)}.`
      : standing
        ? `You're #${standing}. Climb ${standing - cutoff} place${standing - cutoff === 1 ? '' : 's'} into the top ${cutoff} to reach ${ladderTierName(next)}.`
        : `Finish in the top ${cutoff} to reach ${ladderTierName(next)}.`;

  return (
    <Card>
      <CardContent className="p-3 sm:p-5 space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-sm sm:text-base font-semibold">Your ranks</h3>
          <span className="text-[11px] sm:text-xs text-muted-foreground">{highestUnlocked + 1}/{TIER_ORDER.length} unlocked</span>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {TIER_ORDER.map((t, i) => {
            const isCurrent = i === curIdx;
            const unlocked = i <= highestUnlocked;
            const asset = TIER_ASSETS[t];
            const Icon = asset.icon;
            const color = TIER_COLORS[t];
            const img = unlocked ? asset.image : asset.lockedImage ?? asset.image;
            const date = unlockedAt[t];
            return (
              <Popover key={t}>
                <PopoverTrigger asChild>
                  <button type="button" aria-label={`${ladderTierName(t)} — ${isCurrent ? 'current rank' : unlocked ? 'unlocked' : 'locked'}`}
                    className={`relative flex flex-col items-center gap-1 rounded-xl border p-1.5 sm:p-2 transition ${isCurrent ? 'border-primary bg-primary/10' : 'border-border'} ${unlocked ? '' : 'opacity-50'}`}>
                    <div className="relative h-8 w-8 sm:h-11 sm:w-11 flex items-center justify-center rounded-full"
                      style={unlocked ? { background: `${color}26`, boxShadow: isCurrent ? `0 0 18px ${color}99` : undefined } : undefined}>
                      {img ? <img src={img} alt="" className={`h-full w-full object-contain ${unlocked ? '' : 'grayscale'}`} />
                        : <Icon className="h-4 w-4 sm:h-6 sm:w-6" style={{ color: unlocked ? color : undefined }} />}
                      {!unlocked && <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-muted-foreground" />}
                    </div>
                    <span className="text-[9px] sm:text-[11px] font-medium leading-tight truncate max-w-full">{ladderTierName(t)}</span>
                    {isCurrent && <span className="text-[8px] sm:text-[10px] text-primary font-semibold leading-none">You are here</span>}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-60 text-sm space-y-1">
                  <p className="font-semibold">{ladderTierName(t)}</p>
                  {isCurrent ? <p className="text-muted-foreground">Your current rank.</p>
                    : unlocked ? <p className="text-muted-foreground">Unlocked{date ? ` on ${new Date(date).toLocaleDateString()}` : ''}.</p>
                    : <p className="text-muted-foreground">Locked. Move up one rank per sprint by finishing inside your group's cutoff{i > 0 ? ` (top ${TIER_PROMOTION_CUTOFFS[TIER_ORDER[i - 1]]} in ${ladderTierName(TIER_ORDER[i - 1])})` : ''}.</p>}
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">{nextLine}</p>
      </CardContent>
    </Card>
  );
}
