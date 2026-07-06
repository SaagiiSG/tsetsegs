import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useOtherStudentProfile } from '@/hooks/useOtherStudentProfile';
import { TierType } from '@/data/badgeDefinitions';
import { 
  ProfileHeader, 
  ActivityHeatmap, 
  PerformanceStatsGrid,
  LevelProgressCard,
  RankHistoryGraph
} from '@/components/student/profile';
import { FeaturedBadgesReadOnly } from '@/components/student/profile/FeaturedBadgesReadOnly';

interface FullProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  username?: string;
}

export function FullProfileDialog({ open, onOpenChange, userId, username }: FullProfileDialogProps) {
  const profile = useOtherStudentProfile(open ? userId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="
          gap-0 p-0 border-0 sm:border
          w-screen h-[100dvh] max-w-none rounded-none
          sm:w-[92vw] sm:h-auto sm:max-h-[92vh] sm:rounded-lg
          lg:w-[80vw] xl:w-[64vw]
          flex flex-col overflow-hidden
        "
      >
        <DialogHeader className="px-4 sm:px-6 py-3 border-b shrink-0 text-left bg-background/95 backdrop-blur sticky top-0 z-10">
          <DialogTitle className="text-base sm:text-lg pr-10 truncate">
            {username || profile.username}'s Profile
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 w-full">
          {profile.isLoading ? (
            <div className="space-y-3 sm:space-y-6 p-3 sm:p-6 w-full max-w-full">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-6 p-2.5 sm:p-6 w-full max-w-full overflow-x-hidden">
              {/* Profile Header */}
              <ProfileHeader
                username={profile.username}
                avatarInitial={profile.avatarInitial}
                level={profile.level}
                levelProgress={profile.levelProgress}
                totalPoints={profile.totalPoints}
                pointsToNextLevel={profile.pointsToNextLevel}
                currentTier={profile.currentTier as TierType}
                reservedNextTier={profile.reservedNextTier}
                createdAt={profile.createdAt}
                lastLogin={profile.lastLogin}
              />

              {/* Activity Heatmap - scrolls horizontally on narrow screens */}
              <div className="-mx-0.5 overflow-x-auto sm:overflow-visible">
                <ActivityHeatmap
                  activityData={profile.activityHeatmap}
                  currentStreak={profile.performanceStats?.currentStreak || 0}
                  longestStreak={profile.performanceStats?.longestStreak || 0}
                  totalActiveDays={profile.performanceStats?.totalActiveDays || 0}
                />
              </div>

              {/* Featured Badges (Read-only) */}
              <FeaturedBadgesReadOnly
                featuredBadges={profile.featuredBadges}
                badgeStats={profile.badgeStats}
              />

              {/* Level Progress & Rank History */}
              <div className="grid grid-cols-1 gap-3 sm:gap-6">
                <LevelProgressCard
                  level={profile.level}
                  totalPoints={profile.totalPoints}
                  levelProgress={profile.levelProgress}
                  pointsToNextLevel={profile.pointsToNextLevel}
                />
                <RankHistoryGraph
                  rankHistory={profile.rankHistory}
                  currentTier={profile.currentTier as TierType}
                />
              </div>

              {/* Performance Stats */}
              <PerformanceStatsGrid stats={profile.performanceStats} />
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}