import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClosingReportContent } from './student/StudentClosingReport';

export default function PublicClosingReport() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-closing-report', token],
    enabled: !!token,
    queryFn: async () => {
      // Fetch token record
      const { data: tokenData, error: tokenError } = await supabase
        .from('closing_report_tokens')
        .select('student_id, batch_id, expires_at')
        .eq('token', token!)
        .single();

      if (tokenError || !tokenData) throw new Error('Invalid or expired link');
      if (new Date(tokenData.expires_at) < new Date()) throw new Error('This report link has expired');

      const studentId = tokenData.student_id;
      const batchId = tokenData.batch_id;

      // Fetch student
      const { data: student } = await supabase
        .from('students')
        .select('first_name, last_name')
        .eq('id', studentId)
        .single();

      // Fetch batch
      const { data: batch } = await supabase
        .from('batches')
        .select('batch_name, course_type')
        .eq('id', batchId)
        .single();

      if (batch?.course_type === 'IELTS') throw new Error('Report not available for IELTS');

      // Attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', studentId)
        .eq('batch_id', batchId)
        .single();

      let attendanceRate = 0;
      let totalSessions = 0;
      if (attendance) {
        const sessionKeys = Array.from({ length: 15 }, (_, i) => `session_${i + 1}`);
        const attended = sessionKeys.filter(k => {
          const val = (attendance as any)[k];
          return val === 'present' || val === 'late';
        }).length;
        const total = sessionKeys.filter(k => (attendance as any)[k] !== null).length;
        totalSessions = total;
        attendanceRate = total > 0 ? Math.round((attended / total) * 100) : 0;
      }

      // Homework
      const { data: homework } = await supabase
        .from('homework')
        .select('completed')
        .eq('student_id', studentId)
        .eq('batch_id', batchId);

      const hwTotal = homework?.length || 0;
      const hwDone = homework?.filter(h => h.completed).length || 0;
      const homeworkCompletion = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 0;

      // Mock scores
      const { data: mockTests } = await supabase
        .from('practice_tests')
        .select('test_number, score')
        .eq('student_id', studentId)
        .eq('batch_id', batchId)
        .order('test_number', { ascending: true });

      const firstMock = mockTests?.[0]?.score ?? null;
      const highestMock = mockTests?.length ? Math.max(...mockTests.map(t => t.score || 0)) : null;
      const lastMock = mockTests?.length ? mockTests[mockTests.length - 1]?.score : null;
      const scoreImprovement = firstMock && lastMock ? lastMock - firstMock : null;

      // Total questions
      const { data: studentAccount } = await supabase
        .from('student_accounts')
        .select('id')
        .eq('linked_student_id', studentId)
        .single();

      let totalQuestionsAttempted = 0;
      if (studentAccount) {
        const { count } = await supabase
          .from('student_attempts')
          .select('id', { count: 'exact', head: true })
          .eq('student_account_id', studentAccount.id);
        totalQuestionsAttempted = count || 0;
      }

      return {
        studentName: `${student?.first_name || ''} ${student?.last_name || ''}`.trim(),
        batchName: batch?.batch_name,
        attendanceRate,
        totalSessions,
        homeworkCompletion,
        firstMockScore: firstMock,
        highestMockScore: highestMock,
        scoreImprovement,
        totalQuestionsAttempted,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        {(error as Error)?.message || 'Report not found'}
      </div>
    );
  }

  return <ClosingReportContent data={data} />;
}
