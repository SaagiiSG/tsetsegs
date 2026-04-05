import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { BatchOverview } from '@/components/admin/BatchOverview';
import { BatchesView } from '@/components/admin/BatchesView';
import { CreateBatchForm } from '@/components/admin/CreateBatchForm';
import { TeamManagement } from '@/components/admin/TeamManagement';
import { StudentAccountsManagement } from '@/components/admin/StudentAccountsManagement';
import AdminSettings from '@/pages/AdminSettings';
import QuestionBank from '@/pages/admin/QuestionBank';
import AdminBatchAnalytics from '@/pages/admin/AdminBatchAnalytics';
import TeacherStudentProfile from '@/pages/TeacherStudentProfile';
import StudentSearch from '@/pages/admin/StudentSearch';
import SATSchedule from '@/pages/admin/SATSchedule';
import BluebookManager from '@/pages/admin/BluebookManager';
import SprintMonitor from '@/pages/admin/SprintMonitor';
import AnalyticsDashboard from '@/pages/admin/AnalyticsDashboard';
import ReviewSessions from '@/pages/admin/ReviewSessions';
import BugReports from '@/pages/admin/BugReports';
import { RegistrationQueue } from '@/components/admin/RegistrationQueue';
import { LogOut, Users } from 'lucide-react';

const Admin = () => {
  const [isTeacher, setIsTeacher] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

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

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {import.meta.env.DEV && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/30">
                  DEV MODE
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={signOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <div className="flex w-full">
          <AdminSidebar />
          <main className="flex-1 container mx-auto px-4 py-8">
            <Routes>
              <Route index element={<DashboardStats />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="overview" element={<BatchOverview />} />
              <Route path="analytics/:batchId" element={<AdminBatchAnalytics />} />
              <Route path="batches" element={<BatchesView />} />
              <Route path="create" element={<CreateBatchForm onSuccess={() => {}} />} />
              <Route path="questions" element={<QuestionBank />} />
              <Route path="bluebook/*" element={<BluebookManager />} />
              <Route path="sprint-monitor" element={<SprintMonitor />} />
              <Route path="team" element={<TeamManagement />} />
              <Route path="students" element={<StudentAccountsManagement />} />
              <Route path="search" element={<StudentSearch />} />
              <Route path="sat-schedule" element={<SATSchedule />} />
              <Route path="student/:studentId" element={<TeacherStudentProfile />} />
              <Route path="review-sessions" element={<ReviewSessions />} />
              <Route path="bug-reports" element={<BugReports />} />
              <Route path="registration-queue" element={<RegistrationQueue />} />
              <Route path="settings" element={<AdminSettings />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
