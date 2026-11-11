import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClosingReportContent } from './student/StudentClosingReport';

export default function PublicClosingReport() {
  const { token } = useParams<{ token: string }>();

  const { data: settings } = useQuery({
    queryKey: ['closing-report-settings', 'public', token],
    queryFn: async () => {
      // Parents aren't signed in, so the wording comes from a function that checks the report link.
      const { data } = await supabase.rpc('report_settings_for_token' as any, { _token: token });
      const row = (data as { heading: string; body: string; sign_off: string }[] | null)?.[0];
      return row ?? null;
    },
    enabled: !!token,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-closing-report', token],
    enabled: !!token,
    queryFn: async () => {
      // Parents aren't signed in: one function checks the link and returns this student's class, attendance and homework.
      const { data: report, error: reportError } = await supabase.rpc('report_public_data' as any, { _token: token });
      const payload = report as {
        expired: boolean;
        batch: { batch_name: string; course_type: string } | null;
        attendance: Record<string, unknown> | null;
        homework: { completed: boolean | null }[];
      } | null;
      if (reportError || !payload) throw new Error('Invalid or expired link');
      if (payload.expired) throw new Error('This report link has expired');

      const { data: nameRows } = await supabase.rpc('student_name_for_report' as any, { _token: token });
      const student = (nameRows as { first_name: string; last_name: string | null }[] | null)?.[0];

      const batch = payload.batch;
      if (batch?.course_type === 'IELTS') throw new Error('Report not available for IELTS');

      const attendance = payload.attendance;

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

      const homework = payload.homework;

      const hwTotal = homework?.length || 0;
      const hwDone = homework?.filter(h => h.completed).length || 0;
      const homeworkCompletion = hwTotal > 0 ? Math.round((hwDone / hwTotal) * 100) : 0;

      const { data: mockTestRows } = await supabase.rpc('report_practice_tests' as any, { _token: token });
      const mockTests = mockTestRows as { test_number: number; score: number | null }[] | null;

      const firstMock = mockTests?.[0]?.score ?? null;
      const highestMock = mockTests?.length ? Math.max(...mockTests.map(t => t.score || 0)) : null;
      const lastMock = mockTests?.length ? mockTests[mockTests.length - 1]?.score : null;
      const scoreImprovement = firstMock && lastMock ? lastMock - firstMock : null;

      const { data: attemptCount } = await supabase.rpc('report_attempt_count' as any, { _token: token });
      const totalQuestionsAttempted = Number(attemptCount) || 0;

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

  return <ClosingReportContent data={data} settings={settings} />;
}
