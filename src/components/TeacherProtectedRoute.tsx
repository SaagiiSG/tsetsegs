import { Navigate } from 'react-router-dom';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';

export function TeacherProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, teacherName, isLoading, needsPasswordChange } = useTeacherAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !teacherName) {
    return <Navigate to="/teacher/login" replace />;
  }

  if (needsPasswordChange) {
    return <Navigate to="/teacher/change-password" replace />;
  }

  return <>{children}</>;
}