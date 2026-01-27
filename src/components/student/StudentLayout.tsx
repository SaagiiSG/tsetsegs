import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { StudentDashboardSidebar } from './StudentDashboardSidebar';
import { StudentBottomNav } from './StudentBottomNav';
import { useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

export function StudentLayout() {
  const { student, isLoading } = useStudentAuth();

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
          {/* Mobile header with sidebar trigger */}
          <div className="md:hidden flex items-center gap-2 p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
            <SidebarTrigger />
            <span className="font-semibold text-sm">SAT Practice</span>
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
