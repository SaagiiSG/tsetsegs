import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Loader2 } from 'lucide-react';

export function StudentsTab() {
  // Fetch student accounts with progress summary
  const { data: students, isLoading } = useQuery({
    queryKey: ['practice-students-detailed'],
    queryFn: async () => {
      const { data: studentAccounts, error } = await supabase
        .from('student_accounts')
        .select('*')
        .order('last_login', { ascending: false });

      if (error) throw error;

      // Get progress and attempts for each student
      const studentsWithStats = await Promise.all(
        studentAccounts.map(async (student) => {
          // Get videos watched
          const { count: videosWatched } = await supabase
            .from('student_progress')
            .select('*', { count: 'exact', head: true })
            .eq('student_account_id', student.id)
            .eq('video_watched', true);

          // Get attempts
          const { data: attempts } = await supabase
            .from('student_attempts')
            .select('is_correct')
            .eq('student_account_id', student.id);

          const totalAttempts = attempts?.length || 0;
          const correctAttempts = attempts?.filter(a => a.is_correct).length || 0;
          const accuracy = totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

          // Get active sessions count
          const { count: activeSessions } = await supabase
            .from('student_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('student_account_id', student.id)
            .eq('is_active', true);

          return {
            ...student,
            videosWatched: videosWatched || 0,
            totalAttempts,
            correctAttempts,
            accuracy,
            activeSessions: activeSessions || 0
          };
        })
      );

      return studentsWithStats;
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (!students || students.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Practice Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No students registered yet</p>
            <p className="text-sm">Students will appear here after they log in at /practice</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Practice Students ({students.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Videos</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono">{student.phone_number}</TableCell>
                  <TableCell>{student.videosWatched}/68</TableCell>
                  <TableCell>{student.totalAttempts}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={student.accuracy >= 70 ? 'default' : student.accuracy >= 50 ? 'secondary' : 'destructive'}
                    >
                      {student.accuracy}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.activeSessions}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {student.last_login 
                      ? new Date(student.last_login).toLocaleDateString()
                      : 'Never'
                    }
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(student.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
