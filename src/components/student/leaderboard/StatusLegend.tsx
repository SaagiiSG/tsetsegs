import { ArrowDown, ArrowUp, AlertTriangle, Shield, Flame, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LAST_SPRINT_OF_SEASON } from '@/lib/rankProgression';
import { TIER_DISPLAY_NAMES, TIER_PROMOTION_CUTOFFS, TierType } from '@/data/badgeDefinitions';

interface StatusLegendProps {
  /** Sprint number being shown — 3 means season finale (different rules). */
  sprintNumber?: number | null;
  /** Tier of the group being shown, used to name the promotion cutoff. */
  tier?: string;
}

interface LegendItem {
  key: string;
  chip: React.ReactNode;
  meaning: string;
}

/**
 * Explains the status column of the leaderboard in plain language.
 * The rules differ on the season finale (last sprint), so the list adapts.
 */
export function StatusLegend({ sprintNumber, tier }: StatusLegendProps) {
  const isFinale = sprintNumber === LAST_SPRINT_OF_SEASON;
  const tierName = TIER_DISPLAY_NAMES[(tier as TierType) ?? 'unranked'] || 'your tier';
  const cutoff = TIER_PROMOTION_CUTOFFS[(tier as TierType) ?? 'unranked'] ?? 20;

  const finaleItems: LegendItem[] = [
    {
      key: 'kept',
      chip: (
        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white gap-1">
          <Shield className="h-3 w-3" />
          RANK KEPT
        </Badge>
      ),
      meaning:
        'You finished #1 in your group on the last sprint of the season, so you carry your exact rank into the new season — no promotion, no drop.',
    },
    {
      key: 'to',
      chip: (
        <Badge variant="outline" className="border-destructive/50 text-destructive gap-1">
          <ArrowDown className="h-3 w-3" />
          TO SILVER
        </Badge>
      ),
      meaning:
        'Everyone except the group winner drops exactly one rank when the season ends. The tier after "TO" is the rank you will start the new season in.',
    },
    {
      key: 'stays',
      chip: (
        <Badge variant="outline" className="text-muted-foreground">
          STAYS UNRANKED
        </Badge>
      ),
      meaning: 'You are already at the bottom rank, so there is nothing to drop to — you stay where you are.',
    },
  ];

  const sprintItems: LegendItem[] = [
    {
      key: 'advancing-1',
      chip: (
        <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white gap-1">
          <Flame className="h-3 w-3" />
          ADVANCING
        </Badge>
      ),
      meaning: `You are #1 in your group. Finish here and you move up a rank (and earn the ${tierName} champion badge).`,
    },
    {
      key: 'advancing',
      chip: (
        <Badge variant="outline" className="border-green-500 text-green-500 gap-1">
          <ArrowUp className="h-3 w-3" />
          ADVANCING
        </Badge>
      ),
      meaning: `You are inside the top ${cutoff} of your ${tierName} group — the promotion zone. Stay here until the sprint ends to move up a rank.`,
    },
    {
      key: 'risk',
      chip: (
        <Badge variant="outline" className="border-yellow-500 text-yellow-500 gap-1">
          <AlertTriangle className="h-3 w-3" />
          AT RISK
        </Badge>
      ),
      meaning: 'You are close to the cutoff line. A few more points puts you back in the promotion zone.',
    },
    {
      key: 'none',
      chip: <span className="text-xs text-muted-foreground">—</span>,
      meaning: `Outside the top ${cutoff}. If the sprint ends like this you drop one rank, so there is still time to climb.`,
    },
  ];

  const items = isFinale ? finaleItems : sprintItems;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          What do these labels mean?
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[300px] sm:w-[360px] p-3 sm:p-4">
        <p className="text-sm font-semibold mb-1">
          {isFinale ? 'Season finale — what happens next' : 'Sprint status labels'}
        </p>
        <p className="text-[11px] text-muted-foreground mb-3">
          {isFinale
            ? 'This is the last sprint of the season. The label on each row shows the rank that student starts the new season with.'
            : 'The label on each row shows where that student lands when this sprint ends.'}
        </p>
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.key} className="flex flex-col gap-1">
              <div className="flex items-center">{item.chip}</div>
              <p className="text-[11px] leading-snug text-muted-foreground">{item.meaning}</p>
            </li>
          ))}
        </ul>
        <p className="text-[10px] text-muted-foreground mt-3 pt-2 border-t">
          On small screens the label shows as an icon only — tap this help any time to decode it.
        </p>
      </PopoverContent>
    </Popover>
  );
}
