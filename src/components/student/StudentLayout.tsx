import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { CheckInWidget } from './CheckInWidget';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2, Flame, Snowflake } from 'lucide-react';
import { StudentDashboardSidebar } from './StudentDashboardSidebar';
import { StudentBottomNav } from './StudentBottomNav';
import { WelcomeOnboardingModal } from './WelcomeOnboardingModal';
import { LinkEmailModal } from './LinkEmailModal';
import { IELTSPracticeNotice } from './IELTSPracticeNotice';
import { CourseSwitcher } from './CourseSwitcher';
import { getEnrolledCourses } from '@/lib/courseRouting';
import { useStudentCourses } from '@/hooks/useStudentCourses';
import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useStudentTier } from '@/hooks/useStudentTier';
import { TIER_DISPLAY_NAMES, TIER_COLORS } from '@/data/badgeDefinitions';
import { CALCULATOR_SNAP_EVENT, SnapSide } from './DesmosCalculator';
import { useLocation } from 'react-router-dom';
import {
  PracticeCommandSheetProvider,
  usePracticeCommandSheet,
} from './practice/PracticeCommandSheetContext';
import { PracticeCommandSheet } from './practice/PracticeCommandSheet';
import { PracticeQuickFab } from './practice/PracticeQuickFab';
import { GestureHintOverlay } from './practice/GestureHintOverlay';
import { useSwipe } from '@/hooks/useSwipe';
import { StreakCelebrationListener } from './StreakCelebrationListener';
import { useStudentStreak } from '@/hooks/useStudentStreak';
import { StreakHistoryDialog } from './StreakHistoryDialog';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

function StudentLayoutContent() {
  const { student, isLoading: studentLoading } = useStudentAuth();
  const { user: teacherUser, teacherName, isLoading: teacherLoading } = useTeacherAuth();
  const { isAdmin, isLoading: adminLoading } = useAuth();
  const { tier } = useStudentTier();
  const { setOpenMobile, setOpen } = useSidebar();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [streakDialogOpen, setStreakDialogOpen] = useState(false);
  const courses = useStudentCourses();
  const { streak, isStreakActive, freezersAvailable } = useStudentStreak();
  const currentStreak = streak?.current_streak ?? 0;

  // Show onboarding if student has no SAT date set and hasn't completed onboarding
  useEffect(() => {
    if (student && !student.onboarding_completed) {
      const isTeacherOrAdminViewing = (teacherUser && teacherName) || isAdmin;
      if (!isTeacherOrAdminViewing) {
        setShowOnboarding(true);
      }
    }
  }, [student, teacherUser, teacherName, isAdmin]);

  // Allow access if user is a student, teacher, or admin
  const isTeacherOrAdmin = (teacherUser && teacherName) || isAdmin;
  const hasAccess = student || isTeacherOrAdmin;
  // Wait until ALL auth checks have settled before deciding access.
  // Using && caused a redirect loop: teacher/admin auth resolves instantly,
  // flipping isLoading=false while student is still loading, kicking the user
  // back to /practice → StudentPortal then redirects to /practice/dashboard → loop.
  const isLoading = studentLoading || teacherLoading || adminLoading;

  // Security: Prevent screenshots (CSS-based) - only for students
  useEffect(() => {
    if (student && !isTeacherOrAdmin) {
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';
    }
    
    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, [student, isTeacherOrAdmin]);

  // Collapse sidebar when calculator snaps left
  useEffect(() => {
    const handleSnapChange = (e: CustomEvent<{ snapSide: SnapSide }>) => {
      if (e.detail.snapSide === 'left') {
        setOpen(false);
        setOpenMobile(false);
      }
    };

    window.addEventListener(CALCULATOR_SNAP_EVENT, handleSnapChange as EventListener);
    return () => {
      window.removeEventListener(CALCULATOR_SNAP_EVENT, handleSnapChange as EventListener);
    };
  }, [setOpen, setOpenMobile]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) {
    return <Navigate to="/practice" replace />;
  }

  // SAT-only gate: IELTS-only students cannot access the practice portal.
  // Teachers/admins viewing a student bypass this gate.
  if (student && !isTeacherOrAdmin && !courses.loading && courses.isIELTSOnly) {
    return <IELTSPracticeNotice />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex w-full">
      <StudentDashboardSidebar />
      
      <main className="flex-1 pb-16 md:pb-0 overflow-auto">
        {/* Mobile check-in banner */}
        <div className="md:hidden sticky top-0 z-40">
          <CheckInWidget variant="banner" />
        </div>
        {/* Header with sidebar trigger and tier badge */}
        <div className="flex items-center justify-between px-2.5 py-2 md:p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-1.5 md:gap-2">
            <SidebarTrigger />
            <span className="font-semibold text-xs md:text-sm">SAT Practice</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile streak counter */}
            <button
              type="button"
              onClick={() => setStreakDialogOpen(true)}
              title={isStreakActive ? `${currentStreak} day streak — tap for history` : 'Start your streak today'}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono transition-all hover:scale-105 active:scale-95 md:hidden",
                isStreakActive
                  ? "bg-gradient-to-br from-orange-500/20 to-red-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              )}
            >
              <motion.span
                animate={isStreakActive ? { scale: [1, 1.15, 1] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="inline-flex"
              >
                <Flame className={cn("w-3.5 h-3.5", isStreakActive ? "fill-orange-500/40" : "grayscale opacity-50")} />
              </motion.span>
              {currentStreak}
            </button>
            {freezersAvailable > 0 && (
              <button
                type="button"
                onClick={() => setStreakDialogOpen(true)}
                title={`${freezersAvailable} streak freezer${freezersAvailable === 1 ? '' : 's'}`}
                className="md:hidden flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold font-mono bg-gradient-to-br from-sky-400/20 to-blue-500/20 text-sky-600 dark:text-sky-300 border border-sky-400/30 hover:scale-105 active:scale-95 transition-all"
              >
                <Snowflake className="w-3.5 h-3.5" />
                {freezersAvailable}
              </button>
            )}
            <div 
              className="flex items-center gap-1 px-2 py-0.5 md:gap-1.5 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wide"
              style={{ 
                backgroundColor: `${TIER_COLORS[tier]}20`,
                color: TIER_COLORS[tier],
                border: `1.5px solid ${TIER_COLORS[tier]}40`
              }}
            >
              <div 
                className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full" 
                style={{ backgroundColor: TIER_COLORS[tier] }}
              />
              {TIER_DISPLAY_NAMES[tier]}
            </div>
          </div>
          <PracticeQuickFab compact />
        </div>
        
        <Outlet />
      </main>

      {/* SAT Date Onboarding Modal */}
      <WelcomeOnboardingModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      {student && !isTeacherOrAdmin && <LinkEmailModal />}
      <StreakHistoryDialog open={streakDialogOpen} onOpenChange={setStreakDialogOpen} />
      
      <StudentBottomNav />

      {/* iOS-style quick command sheet (⌘K, swipe-up, FAB) */}
      <PracticeCommandSheet />
      <GestureHintOverlay />
      <GlobalEdgeSwipeUp />
      <StreakCelebrationListener />
      
      {/* Security overlay */}
      <div 
        className="fixed inset-0 pointer-events-none z-40 opacity-0 select-none"
        style={{ 
          background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.01) 10px, rgba(0,0,0,0.01) 20px)'
        }}
      />
    </div>
  );
}

/** Listens for an upward swipe from the bottom edge anywhere in /practice/* and opens the command sheet. */
function GlobalEdgeSwipeUp() {
  const { setOpen } = usePracticeCommandSheet();
  const { pathname } = useLocation();
  const enabled = pathname.startsWith('/practice');

  useSwipe(
    {
      enabled,
      edgeOnly: { from: 'bottom', px: 32 },
      onSwipeUp: () => setOpen(true),
      threshold: 40,
    },
  );
  return null;
}

export function StudentLayout() {
  return (
    <SidebarProvider>
      <PracticeCommandSheetProvider>
        <StudentLayoutContent />
      </PracticeCommandSheetProvider>
    </SidebarProvider>
  );
}
