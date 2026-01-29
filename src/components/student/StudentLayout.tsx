import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { StudentDashboardSidebar } from './StudentDashboardSidebar';
import { StudentBottomNav } from './StudentBottomNav';
import { useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useStudentTier } from '@/hooks/useStudentTier';
import { TIER_DISPLAY_NAMES, TIER_COLORS } from '@/data/badgeDefinitions';

export function StudentLayout() {
  const { student, isLoading } = useStudentAuth();
  const { tier } = useStudentTier();

  // Security: Prevent screenshots (CSS-based)
  useEffect(() => {
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    
    return () => {
      document.body.style.userSelect = '';
      document.body.style.webkitUserSelect = '';
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!student) {
    return <Navigate to="/practice" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex w-full">
        <StudentDashboardSidebar />
        
        <main className="flex-1 pb-20 md:pb-0 overflow-auto">
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
        
        <StudentBottomNav />
        
        {/* Security overlay */}
        <div 
          className="fixed inset-0 pointer-events-none z-40 opacity-0 select-none"
          style={{ 
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.01) 10px, rgba(0,0,0,0.01) 20px)'
          }}
        />
      </div>
    </SidebarProvider>
  );
}
