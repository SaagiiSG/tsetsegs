import { Navigate, Outlet } from 'react-router-dom';
import { Loader2, Languages } from 'lucide-react';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { IELTSSidebar } from './IELTSSidebar';
import { CourseSwitcher } from '@/components/student/CourseSwitcher';
import { getEnrolledCourses } from '@/lib/courseRouting';

function IELTSLayoutContent() {
  const { student, isLoading: studentLoading } = useStudentAuth();
  const { user: teacherUser, teacherName, isLoading: teacherLoading } = useTeacherAuth();
  const { isAdmin, isLoading: adminLoading } = useAuth();

  const isLoading = studentLoading || teacherLoading || adminLoading;
  const isTeacherOrAdmin = (teacherUser && teacherName) || isAdmin;
  const hasAccess = student || isTeacherOrAdmin;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasAccess) return <Navigate to="/practice" replace />;

  // Guard: only IELTS-enrolled students (or staff) can be here.
  if (student && !isTeacherOrAdmin) {
    const { hasIELTS } = getEnrolledCourses(student.linked_students);
    if (!hasIELTS) return <Navigate to="/practice/home" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex w-full">
      <IELTSSidebar />

      <main className="flex-1 pb-16 md:pb-0 overflow-auto">
        <div className="flex items-center justify-between px-2.5 py-2 md:p-4 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-1.5 md:gap-2">
            <SidebarTrigger />
            <span className="font-semibold text-xs md:text-sm inline-flex items-center gap-1.5">
              <Languages className="h-3.5 w-3.5 text-primary" />
              IELTS Prep
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CourseSwitcher current="IELTS" />
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}

export function IELTSLayout() {
  return (
    <SidebarProvider>
      <IELTSLayoutContent />
    </SidebarProvider>
  );
}
