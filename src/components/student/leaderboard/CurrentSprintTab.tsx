import { motion } from 'framer-motion';
import { Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LeaderboardEntry, SprintInfo, GroupInfo } from '@/hooks/useLeaderboard';
import { TIER_PROMOTION_CUTOFFS, TierType } from '@/data/badgeDefinitions';
import { SprintTimer } from './SprintTimer';
import { LeaderboardRow } from './LeaderboardRow';

interface CurrentSprintTabProps {
  sprint: SprintInfo | null;
  leaderboard: LeaderboardEntry[];
  currentUserId: string | undefined;
  isLoading: boolean;
  groupInfo?: GroupInfo | null;
  onSprintEnd?: () => void;
}

export function CurrentSprintTab({ 
  sprint, 
  leaderboard, 
  currentUserId, 
  isLoading,
  groupInfo,
  onSprintEnd
}: CurrentSprintTabProps) {
  // Find current user's ranking to get their tier
  const currentUserRanking = currentUserId 
    ? leaderboard.find(e => e.userId === currentUserId) 
    : null;

  // Leaderboard is already filtered by user's tier and group from the hook
  const userTier = currentUserRanking?.currentTier || 'unranked';

  // Get cutoff for user's tier (within their group)
  const cutoffRank = TIER_PROMOTION_CUTOFFS[userTier as TierType] || 10;

  return (
    <div className="space-y-6">
      <SprintTimer sprint={sprint} currentUserRanking={currentUserRanking} onSprintEnd={onSprintEnd} />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Your Sprint Competitors</CardTitle>
            {groupInfo && groupInfo.totalGroups > 1 && (
              <Badge variant="outline" className="font-normal">
                Group {groupInfo.groupNumber} of {groupInfo.totalGroups}
              </Badge>
            )}
          </div>
          {groupInfo && (
            <p className="text-xs text-muted-foreground mt-1">
              You compete against up to 40 students in your group. Each group has its own P1 winner!
            </p>
          )}
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
              {leaderboard.map((entry, index) => (
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
              <p>No competitors in your group yet</p>
              <p className="text-sm">Start practicing to earn points!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
