import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Users, Crown, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { 
  CurrentSprintTab, 
  AllTimeTab, 
  MyRankTab,
  SprintEndCelebration
} from '@/components/student/leaderboard';
import { TierType } from '@/data/badgeDefinitions';

export default function StudentLeaderboard() {
  const { student } = useStudentAuth();
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{
    rank: number;
    tier: TierType;
    points: number;
    sprintNumber: number;
    seasonNumber: number;
  } | null>(null);
  
  const {
    activeSprint,
    leaderboard,
    allTimeLeaderboard,
    currentUserEntry,
    pointsToAdvance,
    pointsToTop1,
    isLoading,
    isAllTimeLoading
  } = useLeaderboard();

  // Check if sprint has ended and user was #1
  useEffect(() => {
    if (!activeSprint || !currentUserEntry) return;

    const checkSprintEnd = () => {
      const endDate = new Date(activeSprint.endDate);
      const now = new Date();
      
      // Sprint just ended (within last 5 seconds)
      if (now >= endDate && now.getTime() - endDate.getTime() < 5000) {
        // Check if user was #1
        if (currentUserEntry.rank === 1) {
          const celebrationKey = `sprint-celebration-${activeSprint.id}`;
          const alreadyShown = localStorage.getItem(celebrationKey);
          
          if (!alreadyShown) {
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
      }
    };

    // Check immediately and then every second
    checkSprintEnd();
    const interval = setInterval(checkSprintEnd, 1000);
    return () => clearInterval(interval);
  }, [activeSprint, currentUserEntry]);

  const handleCloseCelebration = useCallback(() => {
    setShowCelebration(false);
  }, []);

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

      {/* Tabs */}
      <Tabs defaultValue="current" className="w-full">
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
              <CurrentSprintTab
                sprint={activeSprint}
                leaderboard={leaderboard}
                currentUserId={student?.id}
                isLoading={isLoading}
              />
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

      {/* Sprint End Celebration */}
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
    </div>
  );
}
