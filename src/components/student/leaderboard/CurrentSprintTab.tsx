import { motion } from 'framer-motion';
import { Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LeaderboardEntry, SprintInfo } from '@/hooks/useLeaderboard';
import { TIER_PROMOTION_CUTOFFS, TierType } from '@/data/badgeDefinitions';
import { SprintTimer } from './SprintTimer';
import { LeaderboardRow } from './LeaderboardRow';

interface CurrentSprintTabProps {
  sprint: SprintInfo | null;
  leaderboard: LeaderboardEntry[];
  currentUserId: string | undefined;
  isLoading: boolean;
  onSprintEnd?: () => void;
}

export function CurrentSprintTab({ 
  sprint, 
  leaderboard, 
  currentUserId, 
  isLoading,
  onSprintEnd
}: CurrentSprintTabProps) {
  // Find current user's ranking to get their tier
  const currentUserRanking = currentUserId 
    ? leaderboard.find(e => e.userId === currentUserId) 
    : null;

  // Filter to only show competitors in the same tier as the current user
  const userTier = currentUserRanking?.currentTier || 'unranked';
  const tierCompetitors = leaderboard.filter(e => e.currentTier === userTier);

  // Get cutoff for user's tier
  const cutoffRank = TIER_PROMOTION_CUTOFFS[userTier as TierType] || 10;

  return (
    <div className="space-y-6">
      <SprintTimer sprint={sprint} currentUserRanking={currentUserRanking} onSprintEnd={onSprintEnd} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your Sprint Competitors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tierCompetitors.length > 0 ? (
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
              {tierCompetitors.map((entry, index) => (
                <LeaderboardRow
                  key={entry.userId}
                  entry={{ ...entry, rank: index + 1 }}
                  isCurrentUser={entry.userId === currentUserId}
                  cutoffRank={cutoffRank}
                />
              ))}
            </motion.div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No competitors in your tier yet</p>
              <p className="text-sm">Start practicing to earn points!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
