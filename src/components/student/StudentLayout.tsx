import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { StudentSidebar } from './StudentSidebar';
import { StudentBottomNav } from './StudentBottomNav';
import { useEffect } from 'react';

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex">
      <StudentSidebar />
      
      <main className="flex-1 pb-20 md:pb-0 overflow-auto">
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
  );
}
