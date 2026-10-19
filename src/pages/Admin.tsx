import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { PlatformOverview } from '@/components/admin/platform/PlatformOverview';
import { PlatformInsights } from '@/components/admin/platform/PlatformInsights';
import { BatchOverview } from '@/components/admin/BatchOverview';
import { BatchesView } from '@/components/admin/BatchesView';
import { TeamManagement } from '@/components/admin/TeamManagement';
import AdminSettings from '@/pages/AdminSettings';
import QuestionBank from '@/pages/admin/QuestionBank';
import AdminBatchAnalytics from '@/pages/admin/AdminBatchAnalytics';
import TeacherStudentProfile from '@/pages/TeacherStudentProfile';
import StudentManagement from '@/pages/admin/StudentManagement';
import QuestionSearch from '@/pages/admin/QuestionSearch';
import SATSchedule from '@/pages/admin/SATSchedule';
import BluebookManager from '@/pages/admin/BluebookManager';
import SprintMonitor from '@/pages/admin/SprintMonitor';
import AnalyticsDashboard from '@/pages/admin/AnalyticsDashboard';
import ReviewSessions from '@/pages/admin/ReviewSessions';
import NGEEAdmin from '@/pages/admin/NGEEAdmin';
import BugReports from '@/pages/admin/BugReports';
import AdminAnnouncements from '@/pages/admin/AdminAnnouncements';
import DatabaseHealth from '@/pages/admin/DatabaseHealth';
import BurnerAdmin from '@/pages/admin/BurnerAdmin';
import ConceptVideosAdmin from '@/pages/admin/ConceptVideosAdmin';
import IntlDbQuestions from '@/pages/admin/IntlDbQuestions';
import InstitutionCustomers from '@/pages/admin/InstitutionCustomers';
import DemoRequests from '@/pages/admin/DemoRequests';
import { usePageTitle } from '@/components/admin/mobile/usePageTitle';
import { AdminCohortProvider } from '@/contexts/AdminCohortContext';
import { CohortSwitcher } from '@/components/admin/CohortSwitcher';
import { Users } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { DevOnlyRoute } from '@/components/admin/DevOnlyRoute';
import { MobileAdminShell } from '@/components/admin/mobile/MobileAdminShell';
import { useSectionGlow } from '@/components/admin/pageGlow';

const Admin = () => {
  const [isTeacher, setIsTeacher] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const pageTitle = usePageTitle();
  const sectionGlow = useSectionGlow();

  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => document.body.classList.remove('admin-theme');
  }, []);

  useEffect(() => {
    checkIfTeacher();
  }, [user]);

  const checkIfTeacher = async () => {
    if (!user?.email) return;

    const { data: allTeachers } = await supabase
      .from('teachers')
      .select('name, username');

    if (allTeachers && allTeachers.length > 0) {
      setIsTeacher(true);
    }
  };

  const routesEl = (
    <Routes>
      <Route index element={<PlatformOverview />} />
      <Route path="tsetsegs/dashboard" element={<DashboardStats />} />
      <Route path="customers" element={<InstitutionCustomers />} />
      <Route path="demo-requests" element={<DemoRequests />} />
      <Route path="analytics" element={<PlatformInsights />} />
      <Route path="tsetsegs/analytics" element={<AnalyticsDashboard />} />
      <Route path="overview" element={<BatchOverview />} />
      <Route path="analytics/:batchId" element={<AdminBatchAnalytics />} />
      <Route path="batches" element={<BatchesView />} />
      <Route path="create" element={<Navigate to="/admin/batches?create=1" replace />} />
      <Route path="questions" element={<QuestionBank />} />
      <Route path="question-search" element={<QuestionSearch />} />
      <Route path="concept-videos" element={<ConceptVideosAdmin />} />
      <Route path="intl-questions" element={<IntlDbQuestions />} />
      <Route path="bluebook/*" element={<DevOnlyRoute><BluebookManager /></DevOnlyRoute>} />
      <Route path="sprint-monitor" element={<SprintMonitor />} />
      <Route path="team" element={<TeamManagement />} />
      <Route path="students" element={<StudentManagement />} />
      <Route path="search" element={<Navigate to="/admin/students" replace />} />
      <Route path="sat-schedule" element={<SATSchedule />} />
      <Route path="student/:studentId" element={<TeacherStudentProfile />} />
      <Route path="review-sessions" element={<ReviewSessions />} />
      <Route path="ngee" element={<NGEEAdmin />} />
      <Route path="bug-reports" element={<BugReports />} />
      <Route path="announcements" element={<AdminAnnouncements />} />
      <Route path="registration-queue" element={<Navigate to="/admin/students" replace />} />
      <Route path="database-health" element={<DatabaseHealth />} />
      <Route path="burner" element={<DevOnlyRoute><BurnerAdmin /></DevOnlyRoute>} />
      <Route path="settings" element={<AdminSettings />} />
    </Routes>
  );

  if (isMobile) {
    return (
      <AdminCohortProvider>
        <MobileAdminShell>{routesEl}</MobileAdminShell>
      </AdminCohortProvider>
    );
  }

  return (
    <AdminCohortProvider>
    <SidebarProvider>
      <div className="min-h-screen w-full bg-background text-foreground">
        <div className="flex w-full min-h-screen">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <header
              className="admin-glass-bar admin-glass-bar--page h-14 flex items-center gap-3 px-4 sticky top-0 z-10"
              style={{ "--section-glow": sectionGlow } as React.CSSProperties}
            >
              <SidebarTrigger />
              <span className="text-sm text-muted-foreground">{pageTitle}</span>
              {import.meta.env.DEV && (
                <span className="px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground rounded border">
                  DEV MODE
                </span>
              )}
              <div className="ml-auto">
                <CohortSwitcher />
              </div>
            </header>
            <main
              className="admin-glow-scope admin-main-glow relative flex-1 w-full max-w-[1440px] mx-auto px-6 py-7 lg:px-8"
              style={{ "--section-glow": sectionGlow } as React.CSSProperties}
            >
              {routesEl}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
    </AdminCohortProvider>
  );
};

export default Admin;
