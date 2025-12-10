import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { DashboardStats } from '@/components/admin/DashboardStats';
import { BatchesView } from '@/components/admin/BatchesView';
import { CreateBatchForm } from '@/components/admin/CreateBatchForm';
import { TeacherManagement } from '@/components/admin/TeacherManagement';
import { SetupTeacherAccounts } from '@/components/admin/SetupTeacherAccounts';
import { UserManagement } from '@/components/admin/UserManagement';
import { StudentAccountsManagement } from '@/components/admin/StudentAccountsManagement';
import AdminSettings from '@/pages/AdminSettings';
import QuestionBank from '@/pages/admin/QuestionBank';
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
              {isTeacher && (
                <Button variant="secondary" onClick={() => navigate('/teacher/login')}>
                  <Users className="w-4 h-4 mr-2" />
                  Teacher Portal
                </Button>
              )}
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
              <Route path="batches" element={<BatchesView />} />
              <Route path="create" element={<CreateBatchForm onSuccess={() => {}} />} />
              {import.meta.env.DEV && <Route path="questions" element={<QuestionBank />} />}
              <Route
                path="teachers"
                element={
                  <div className="space-y-4">
                    <SetupTeacherAccounts />
                    <TeacherManagement />
                  </div>
                }
              />
              <Route path="students" element={<StudentAccountsManagement />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="settings" element={<AdminSettings />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Admin;
