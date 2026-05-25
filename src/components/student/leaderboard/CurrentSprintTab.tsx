import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Users, Crown, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LeaderboardEntry, SprintInfo, GroupInfo } from '@/hooks/useLeaderboard';
import { TIER_PROMOTION_CUTOFFS, TierType, TIER_DISPLAY_NAMES } from '@/data/badgeDefinitions';
import { SprintTimer } from './SprintTimer';
import { LeaderboardRow } from './LeaderboardRow';
import { FullProfileDialog } from './FullProfileDialog';

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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  // Find current user's ranking to get their tier
  const currentUserRanking = currentUserId 
    ? leaderboard.find(e => e.userId === currentUserId) 
    : null;

  // Leaderboard is already filtered by user's tier and group from the hook
  const userTier = currentUserRanking?.currentTier || 'unranked';

  // Get cutoff for user's tier (within their group)
  const cutoffRank = TIER_PROMOTION_CUTOFFS[userTier as TierType] || 10;

  const handleProfileClick = (entry: LeaderboardEntry) => {
    setSelectedUserId(entry.userId);
    setSelectedUsername(entry.username);
    setProfileSheetOpen(true);
  };

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
              You compete against up to 40 students in your group. Tap a competitor to view their full profile!
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : leaderboard.length > 0 ? (
            <TooltipProvider delayDuration={300}>
              <div className="space-y-2">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.userId === currentUserId;
                  const entryWithRank = { ...entry, rank: index + 1 };
                  
                  return (
                    <Tooltip key={entry.userId}>
                      <TooltipTrigger asChild>
                        <div>
                          <LeaderboardRow
                            entry={entryWithRank}
                            isCurrentUser={isCurrentUser}
                            cutoffRank={cutoffRank}
                            onProfileClick={sprint && !isCurrentUser ? handleProfileClick : undefined}
                          />
                        </div>
                      </TooltipTrigger>
                      {!isCurrentUser && sprint && (
                        <TooltipContent side="left" className="max-w-xs">
                          <div className="space-y-1">
                            <p className="font-medium">{entry.username}</p>
                            <p className="text-xs text-muted-foreground">
                              Level {entry.level} • {TIER_DISPLAY_NAMES[entry.currentTier as TierType]}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.totalPoints.toLocaleString()} points this sprint
                            </p>
                            <p className="text-xs text-primary mt-1">Click to view full profile →</p>
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          ) : currentUserRanking && ['ruby', 'diamond', 'platinum'].includes(currentUserRanking.currentTier) ? (
            // Special message for exclusive tiers with no/few competitors
            <div className="text-center py-12 space-y-4">
              <div className="relative inline-block">
                <Crown className="h-16 w-16 mx-auto text-primary opacity-80" />
                <Sparkles className="h-6 w-6 absolute -top-1 -right-1 text-primary animate-pulse" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">
                  {TIER_DISPLAY_NAMES[currentUserRanking.currentTier as TierType]} Tier
                </h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  You've reached an exclusive rank! There are no other competitors in your tier group this sprint.
                </p>
                <p className="text-sm text-muted-foreground">
                  Keep earning points to maintain your elite status.
                </p>
              </div>
            </div>
          ) : !currentUserRanking ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">You haven't joined this sprint yet</p>
              <p className="text-sm mt-1">
                Solve your first problem {sprint ? `in Sprint ${sprint.sprintNumber}` : ''} to join the leaderboard.
              </p>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No competitors in your group yet</p>
              <p className="text-sm">Start practicing to earn points!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Full Profile Dialog */}
      <FullProfileDialog
        open={profileSheetOpen}
        onOpenChange={setProfileSheetOpen}
        userId={selectedUserId}
        username={selectedUsername}
      />
    </div>
  );
}
