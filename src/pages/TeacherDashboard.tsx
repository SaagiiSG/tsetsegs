import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Users, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Batch {
  id: string;
  batch_name: string;
  schedule: string;
  room: string;
  start_date: string;
}

export default function TeacherDashboard() {
  const { teacherName, signOut, isLoading: authLoading } = useTeacherAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log('TeacherDashboard - authLoading:', authLoading, 'teacherName:', teacherName);
    if (!authLoading) {
      console.log('Fetching batches...');
      fetchBatches();
    }
  }, [teacherName, authLoading]);

  const fetchBatches = async () => {
    console.log('fetchBatches called, teacherName:', teacherName);
    if (!teacherName) {
      console.log('No teacher name, setting loading to false');
      setIsLoading(false);
      return;
    }

    try {
      console.log('Querying batches for teacher:', teacherName);
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select('id, batch_name, schedule, room, start_date')
        .eq('teacher', teacherName)
        .order('start_date', { ascending: false });

      console.log('Batches query result:', { batchesData, batchesError });
      if (batchesError) throw batchesError;
      
      setBatches(batchesData || []);

      // Fetch student counts for each batch
      if (batchesData && batchesData.length > 0) {
        const counts: Record<string, number> = {};
        for (const batch of batchesData) {
          const { count, error: countError } = await supabase
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('batch_id', batch.id);
          
          if (!countError) {
            counts[batch.id] = count || 0;
          }
        }
        setStudentCounts(counts);
      }
    } catch (error: any) {
      console.error('Error fetching batches:', error);
      toast({
        title: 'Error',
        description: 'Failed to load classes',
        variant: 'destructive',
      });
    } finally {
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/teacher/login');
  };

  const getStudentCount = (batchId: string) => {
    return studentCounts[batchId] || 0;
  };

  const isOnlineClass = (schedule: string) => {
    return schedule.toLowerCase().includes('online');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {teacherName}! 👋</h1>
            <p className="text-muted-foreground mt-1">Manage your classes and track attendance</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">My Classes</h2>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : batches.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No classes assigned yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {batches.map((batch) => (
                <Card key={batch.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{batch.batch_name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {getStudentCount(batch.id)} students
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="font-medium">Schedule:</p>
                        <p className="text-muted-foreground whitespace-pre-line">{batch.schedule}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {isOnlineClass(batch.schedule) ? (
                          <span className="font-medium text-primary">🌐 Online Class</span>
                        ) : (
                          <>Room {batch.room}</>
                        )}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Start Date:</p>
                      <p className="text-muted-foreground">
                        {new Date(batch.start_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => navigate(`/teacher/students/${batch.id}`)}
                    >
                      View Students & Attendance
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}