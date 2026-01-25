import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTeacherOrAdmin?: boolean;
}

export function ProtectedRoute({ children, requireTeacherOrAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading: adminLoading } = useAuth();
  const { user: teacherUser, teacherName, isLoading: teacherLoading } = useTeacherAuth();

  const isLoading = requireTeacherOrAdmin ? (adminLoading && teacherLoading) : adminLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // For teacher-or-admin routes, allow either
  if (requireTeacherOrAdmin) {
    const hasAccess = isAdmin || (teacherUser && teacherName);
    if (!hasAccess) {
      return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
  }

  // Default admin-only behavior
  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
