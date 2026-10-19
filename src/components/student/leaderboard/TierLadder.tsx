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
      <CardContent className="p-3 sm:p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Ranks</span>
          <span className="text-[10px] text-muted-foreground">{highestUnlocked + 1}/{TIER_ORDER.length} unlocked</span>
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
                    className={`relative flex flex-col items-center gap-1 rounded-xl p-1 transition ${isCurrent ? 'bg-primary/10 ring-1 ring-primary/40' : ''} ${unlocked ? '' : 'opacity-50'}`}>
                    <div className="relative h-12 w-12 sm:h-16 sm:w-16 flex items-center justify-center rounded-full"
                      style={unlocked ? { background: `${color}26`, boxShadow: isCurrent ? `0 0 22px ${color}aa` : undefined } : undefined}>
                      {img ? <img src={img} alt="" className={`h-full w-full object-contain ${unlocked || asset.lockedImage ? '' : 'grayscale'}`} />
                        : <Icon className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: unlocked ? color : undefined }} />}
                      {!unlocked && !asset.lockedImage && <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-muted-foreground" />}
                      {isCurrent && <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px] shadow-primary" />}
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-medium leading-none text-muted-foreground">{ladderTierName(t)}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-60 text-sm space-y-1">
                  <p className="font-semibold">{ladderTierName(t)}{isCurrent && ' · current'}</p>
                  {isCurrent ? <p className="text-muted-foreground">Your current rank.</p>
                    : unlocked ? <p className="text-muted-foreground">Unlocked{date ? ` on ${new Date(date).toLocaleDateString()}` : ''}.</p>
                    : <p className="text-muted-foreground">Locked. Move up one rank per sprint by finishing inside your group's cutoff{i > 0 ? ` (top ${TIER_PROMOTION_CUTOFFS[TIER_ORDER[i - 1]]} in ${ladderTierName(TIER_ORDER[i - 1])})` : ''}.</p>}
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
        <p className="text-[10px] leading-snug text-muted-foreground">{nextLine}</p>
      </CardContent>
    </Card>
  );
}
