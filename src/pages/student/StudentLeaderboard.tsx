import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Crown, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useLeaderboard, LeaderboardEntry, SprintInfo } from '@/hooks/useLeaderboard';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  CurrentSprintTab, 
  AllTimeTab, 
  MyRankTab,
  SprintEndCelebration,
  NoActiveSprintCard,
  EpicBadgeUnlock
} from '@/components/student/leaderboard';
import { TierType, badgeDefinitions, BadgeDefinition } from '@/data/badgeDefinitions';

// Badge name to tier mapping (same as in edge function)
const TIER_BADGE_NAMES: Record<string, string> = {
  unranked: 'Bronze Novice',
  bronze: 'Bronze Novice',
  silver: 'Silver Challenger',
  gold: 'Gold Scholar',
  platinum: 'Platinum Legend',
  diamond: 'Diamond Apex',
  ruby: 'Ruby Legend'
};

export default function StudentLeaderboard() {
  const queryClient = useQueryClient();
  const { student } = useStudentAuth();
  const [showCelebration, setShowCelebration] = useState(false);
  const [showBadgeUnlock, setShowBadgeUnlock] = useState(false);
  const [unlockedBadge, setUnlockedBadge] = useState<BadgeDefinition | null>(null);
  const [celebrationData, setCelebrationData] = useState<{
    rank: number;
    tier: TierType;
    points: number;
    sprintNumber: number;
    seasonNumber: number;
  } | null>(null);
  const [isFinalizingSprint, setIsFinalizingSprint] = useState(false);
  
  // Store last known ranking for when sprint ends
  const [lastKnownRanking, setLastKnownRanking] = useState<{
    entry: LeaderboardEntry;
    sprint: SprintInfo;
  } | null>(null);
  
  const {
    activeSprint,
    lastEndedSprint,
    nextSprint,
    lastSprintResults,
    leaderboard,
    allTimeLeaderboard,
    currentUserEntry,
    pointsToAdvance,
    pointsToTop1,
    isLoading,
    isAllTimeLoading,
    refetchLeaderboard
  } = useLeaderboard();

  // Store the current user's ranking whenever it updates
  useEffect(() => {
    if (currentUserEntry && activeSprint) {
      setLastKnownRanking({
        entry: currentUserEntry,
        sprint: activeSprint
      });
    }
  }, [currentUserEntry, activeSprint]);

  // Finalize sprint and check for badge unlock
  const finalizeSprintAndCheckBadge = useCallback(async (sprintId: string, userTier: TierType, userRank: number) => {
    if (isFinalizingSprint) return;
    setIsFinalizingSprint(true);

    try {
      // First, mark the sprint as inactive
      await supabase
        .from('sprints')
        .update({ is_active: false })
        .eq('id', sprintId);

      // Call finalize-sprint edge function
      const { error } = await supabase.functions.invoke('finalize-sprint', {
        body: { sprintId }
      });

      if (error) {
        console.error('Failed to finalize sprint:', error);
      }

      // Refetch leaderboard data
      await refetchLeaderboard();

      // Check if user got a badge (only top 1 gets badge)
      if (userRank === 1) {
        const badgeName = TIER_BADGE_NAMES[userTier];
        const badge = badgeDefinitions.find(b => b.name === badgeName);
        if (badge) {
          setUnlockedBadge(badge);
        }
      }
    } catch (err) {
      console.error('Error finalizing sprint:', err);
    } finally {
      setIsFinalizingSprint(false);
    }
  }, [isFinalizingSprint, refetchLeaderboard]);

  // Check if sprint has ended and show celebration for ALL users
  useEffect(() => {
    if (!activeSprint || !currentUserEntry) return;

    const checkSprintEnd = async () => {
      const endDate = new Date(activeSprint.endDate);
      const now = new Date();
      
      // Sprint just ended (within last 10 seconds)
      if (now >= endDate && now.getTime() - endDate.getTime() < 10000) {
        const celebrationKey = `sprint-celebration-${activeSprint.id}-${student?.id}`;
        const alreadyShown = localStorage.getItem(celebrationKey);
        
        if (!alreadyShown) {
          // Finalize the sprint and check for badge
          await finalizeSprintAndCheckBadge(
            activeSprint.id, 
            currentUserEntry.currentTier, 
            currentUserEntry.rank
          );
          
          setCelebrationData({
            rank: currentUserEntry.rank,
            tier: currentUserEntry.currentTier,
            points: currentUserEntry.totalPoints,
            sprintNumber: activeSprint.sprintNumber,
            seasonNumber: activeSprint.seasonNumber
          });
          setShowCelebration(true);
          localStorage.setItem(celebrationKey, 'true');
        }
      }
    };

    // Check immediately and then every second
    checkSprintEnd();
    const interval = setInterval(checkSprintEnd, 1000);
    return () => clearInterval(interval);
  }, [activeSprint, currentUserEntry, student?.id, finalizeSprintAndCheckBadge]);

  const handleCloseCelebration = useCallback(() => {
    setShowCelebration(false);
    
    // If there's a badge to unlock, show the badge unlock animation
    if (unlockedBadge) {
      setTimeout(() => {
        setShowBadgeUnlock(true);
      }, 300);
    }
  }, [unlockedBadge]);

  const handleClaimBadge = useCallback(() => {
    setShowBadgeUnlock(false);
    setUnlockedBadge(null);
    
    // Invalidate queries to sync badge collection and points/level
    queryClient.invalidateQueries({ queryKey: ['badges'] });
    queryClient.invalidateQueries({ queryKey: ['badge-stats'] });
    queryClient.invalidateQueries({ queryKey: ['total-points'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    queryClient.invalidateQueries({ queryKey: ['activity-heatmap'] });
    queryClient.invalidateQueries({ queryKey: ['recent-achievements'] });
  }, [queryClient]);

  // Determine if there's no active sprint
  const noActiveSprint = !activeSprint && !isLoading;

  return (
    <div className="p-4 md:p-6 space-y-6 select-none">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-amber-500" />
          Leaderboard
        </h1>
        <p className="text-muted-foreground">
          Compete with other students and climb the ranks
        </p>
      </motion.div>

      {/* Tabs - always show, but Current Sprint tab content changes based on active sprint */}
      <Tabs defaultValue={noActiveSprint ? "alltime" : "current"} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="current" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Current Sprint</span>
            <span className="sm:hidden">Sprint</span>
          </TabsTrigger>
          <TabsTrigger value="alltime" className="gap-2">
            <Crown className="h-4 w-4" />
            <span className="hidden sm:inline">All-Time</span>
            <span className="sm:hidden">All-Time</span>
          </TabsTrigger>
          <TabsTrigger value="myrank" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">My Rank</span>
            <span className="sm:hidden">My Rank</span>
          </TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          <TabsContent value="current" className="mt-0">
            <motion.div
              key="current"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              {noActiveSprint ? (
                <NoActiveSprintCard
                  lastEndedSprint={lastEndedSprint}
                  nextSprint={nextSprint}
                  lastSprintResults={lastSprintResults}
                />
              ) : (
                <CurrentSprintTab
                  sprint={activeSprint}
                  leaderboard={leaderboard}
                  currentUserId={student?.id}
                  isLoading={isLoading}
                />
              )}
            </motion.div>
          </TabsContent>

          <TabsContent value="alltime" className="mt-0">
            <motion.div
              key="alltime"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <AllTimeTab
                leaderboard={allTimeLeaderboard}
                currentUserId={student?.id}
                isLoading={isAllTimeLoading}
              />
            </motion.div>
          </TabsContent>

          <TabsContent value="myrank" className="mt-0">
            <motion.div
              key="myrank"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <MyRankTab
                currentEntry={currentUserEntry}
                leaderboard={leaderboard}
                pointsToAdvance={pointsToAdvance}
                pointsToTop1={pointsToTop1}
                sprint={activeSprint}
              />
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>

      {/* Sprint End Celebration - Shows for ALL users */}
      {celebrationData && (
        <SprintEndCelebration
          isOpen={showCelebration}
          onClose={handleCloseCelebration}
          rank={celebrationData.rank}
          tierReached={celebrationData.tier}
          totalPoints={celebrationData.points}
          sprintNumber={celebrationData.sprintNumber}
          seasonNumber={celebrationData.seasonNumber}
        />
      )}

      {/* Epic Badge Unlock Animation - Shows after celebration for badge winners */}
      {unlockedBadge && (
        <EpicBadgeUnlock
          isOpen={showBadgeUnlock}
          onClaim={handleClaimBadge}
          badge={unlockedBadge}
        />
      )}
    </div>
  );
}
