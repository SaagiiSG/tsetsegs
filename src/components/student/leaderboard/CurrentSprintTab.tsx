import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaderboardEntry, SprintInfo } from '@/hooks/useLeaderboard';
import { TierType, TIER_PROMOTION_CUTOFFS } from '@/data/badgeDefinitions';
import { SprintTimer } from './SprintTimer';
import { TierFilter } from './TierFilter';
import { LeaderboardRow } from './LeaderboardRow';

interface CurrentSprintTabProps {
  sprint: SprintInfo | null;
  leaderboard: LeaderboardEntry[];
  currentUserId: string | undefined;
  isLoading: boolean;
  onTierChange: (tier: TierType | undefined) => void;
}

export function CurrentSprintTab({ 
  sprint, 
  leaderboard, 
  currentUserId, 
  isLoading,
  onTierChange 
}: CurrentSprintTabProps) {
  const [selectedTier, setSelectedTier] = useState<TierType | 'all'>('all');

  const handleTierChange = (tier: TierType | 'all') => {
    setSelectedTier(tier);
    onTierChange(tier === 'all' ? undefined : tier);
  };

  // Get cutoff for current tier filter
  const getCutoffRank = () => {
    if (selectedTier === 'all') {
      // Show bronze cutoff for all view
      return TIER_PROMOTION_CUTOFFS.bronze;
    }
    return TIER_PROMOTION_CUTOFFS[selectedTier];
  };

  return (
    <div className="space-y-4">
      <SprintTimer sprint={sprint} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm">{leaderboard.length} players</span>
        </div>
        <TierFilter selectedTier={selectedTier} onTierChange={handleTierChange} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rankings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leaderboard.length > 0 ? (
            <motion.div 
              className="space-y-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { 
                  opacity: 1,
                  transition: { staggerChildren: 0.02 }
                }
              }}
            >
              {leaderboard.map((entry) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={entry}
                  isCurrentUser={entry.userId === currentUserId}
                  cutoffRank={getCutoffRank()}
                />
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No rankings yet</p>
              <p className="text-sm">Start practicing to earn points!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
