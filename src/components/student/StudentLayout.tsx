import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import { CheckInWidget } from './CheckInWidget';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { StudentDashboardSidebar } from './StudentDashboardSidebar';
import { StudentBottomNav } from './StudentBottomNav';
import { OnboardingSATModal } from './OnboardingSATModal';
import { useEffect, useState } from 'react';
import { SidebarProvider, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { useStudentTier } from '@/hooks/useStudentTier';
import { TIER_DISPLAY_NAMES, TIER_COLORS } from '@/data/badgeDefinitions';
import { CALCULATOR_SNAP_EVENT, SnapSide } from './DesmosCalculator';

function StudentLayoutContent() {
  const { student, isLoading: studentLoading } = useStudentAuth();
  const { user: teacherUser, teacherName, isLoading: teacherLoading } = useTeacherAuth();
  const { isAdmin, isLoading: adminLoading } = useAuth();
  const { tier } = useStudentTier();
  const { setOpenMobile, setOpen } = useSidebar();
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding if student has no SAT date set and hasn't completed onboarding
  useEffect(() => {
    if (student && !student.linked_student?.sat_test_month && !student.onboarding_completed) {
      const isTeacherOrAdminViewing = (teacherUser && teacherName) || isAdmin;
      if (!isTeacherOrAdminViewing) {
        setShowOnboarding(true);
      }
    }
  }, [student, teacherUser, teacherName, isAdmin]);

  // Allow access if user is a student, teacher, or admin
  const isTeacherOrAdmin = (teacherUser && teacherName) || isAdmin;
  const hasAccess = student || isTeacherOrAdmin;
  const isLoading = studentLoading && teacherLoading && adminLoading;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex w-full">
      <StudentDashboardSidebar />
      
      <main className="flex-1 pb-20 md:pb-0 overflow-auto">
        {/* Mobile check-in banner */}
        <div className="md:hidden sticky top-0 z-40">
          <CheckInWidget variant="banner" />
        </div>
        {/* Header with sidebar trigger and tier badge */}
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <span className="font-semibold text-sm">SAT Practice</span>
          </div>
          <div 
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
            style={{ 
              backgroundColor: `${TIER_COLORS[tier]}20`,
              color: TIER_COLORS[tier],
              border: `1.5px solid ${TIER_COLORS[tier]}40`
            }}
          >
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: TIER_COLORS[tier] }}
            />
            {TIER_DISPLAY_NAMES[tier]}
          </div>
        </div>
        
        <Outlet />
      </main>

      {/* SAT Date Onboarding Modal */}
      <OnboardingSATModal open={showOnboarding} onClose={() => setShowOnboarding(false)} />
      
      <StudentBottomNav />
      
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

export function StudentLayout() {
  return (
    <SidebarProvider>
      <StudentLayoutContent />
    </SidebarProvider>
  );
}
