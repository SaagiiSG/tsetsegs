import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BatchCard } from '@/components/admin/BatchCard';
import { CreateBatchForm } from '@/components/admin/CreateBatchForm';
import { TeacherManagement } from '@/components/admin/TeacherManagement';
import { SetupTeacherAccounts } from '@/components/admin/SetupTeacherAccounts';
import { UserManagement } from '@/components/admin/UserManagement';
import { LogOut, GraduationCap, Users } from 'lucide-react';

const Admin = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
    checkIfTeacher();
  }, [user]);

  const fetchBatches = async () => {
    const { data } = await supabase
      .from('batches')
      .select(`
        *,
        students (*)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setBatches(data);
    }
  };

  const checkIfTeacher = async () => {
    if (!user?.email) return;

    // Check if the admin's email matches any teacher in the system
    // For example, if their email is "saranochir.s@gmail.com", check for teacher "Saran-Ochir"
    const { data: teachers } = await supabase
      .from('teachers')
      .select('name, username')
      .ilike('phone', `%${user.email.split('@')[0]}%`); // Basic check

    // Also check by teacher name matching user's display name
    const { data: allTeachers } = await supabase
      .from('teachers')
      .select('name, username');

    if (allTeachers && allTeachers.length > 0) {
      // For now, we'll show the teacher portal link if there are any teachers
      // Admins can access any teacher's view if needed
      setIsTeacher(true);
      setTeacherName(allTeachers[0].name);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
      <header className="bg-background/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Flowers Talent Agency</h1>
              <p className="text-sm text-muted-foreground">Admin Dashboard</p>
            </div>
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

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="batches" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="batches">Batches</TabsTrigger>
            <TabsTrigger value="create">Create Batch</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="batches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Batches</CardTitle>
                <CardDescription>
                  {batches.length} total batch{batches.length !== 1 ? 'es' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {batches.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No batches created yet. Create your first batch to get started!
                  </p>
                ) : (
                  batches.map((batch) => (
                    <BatchCard key={batch.id} batch={batch} onUpdate={fetchBatches} />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <CreateBatchForm onSuccess={fetchBatches} />
          </TabsContent>

          <TabsContent value="teachers" className="space-y-4">
            <SetupTeacherAccounts />
            <TeacherManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Admin;
