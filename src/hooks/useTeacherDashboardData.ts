import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BatchRow {
  id: string;
  batch_name: string;
  nickname: string | null;
  schedule: string;
  room: string;
  start_date: string;
  course_type: string | null;
}

export interface NeedsAttentionStudent {
  id: string;
  name: string;
  missedClasses: number;
  missedHomework: number;
}

export interface TopStudent {
  id: string;
  name: string;
  metric: number;
}

export interface BatchMetrics {
  studentCount: number;
  attendanceRate: number; // 0-100
  homeworkRate: number; // 0-100
  avgAttended: number;
  expectedSessions: number;
  needsAttention: NeedsAttentionStudent[];
  topStudents: TopStudent[];
  isCompleted: boolean;
}

export interface DashboardBatch extends BatchRow {
  metrics: BatchMetrics;
}

export function useTeacherDashboardData(teacherName: string | null) {
  return useQuery({
    queryKey: ["teacher-dashboard-v2", teacherName],
    enabled: !!teacherName,
    staleTime: 60_000,
    queryFn: async (): Promise<DashboardBatch[]> => {
      if (!teacherName) return [];

      const { data: batches, error: bErr } = await supabase
        .from("batches")
        .select("id, batch_name, nickname, schedule, room, start_date, course_type")
        .ilike("teacher", `%${teacherName}%`)
        .order("start_date", { ascending: false });
      if (bErr) throw bErr;
      if (!batches || batches.length === 0) return [];

      const batchIds = batches.map((b) => b.id);

      const { data: studentsData } = await supabase
        .from("students")
        .select("id, name, batch_id")
        .in("batch_id", batchIds);
      const students = studentsData || [];
      const studentIds = students.map((s) => s.id);

      const [attendanceRes, homeworkRes, completionRes] = await Promise.all([
        supabase.from("attendance").select("*").in("batch_id", batchIds),
        studentIds.length
          ? supabase
              .from("homework")
              .select("student_id, session_number, completed")
              .in("student_id", studentIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase.rpc("get_batch_completion_status", { teacher_name: teacherName }),
      ]);

      const attendance = attendanceRes.data || [];
      const homework = (homeworkRes as any).data || [];
      const completionMap: Record<string, boolean> = {};
      (completionRes.data as any)?.forEach((c: any) => {
        completionMap[c.batch_id] = c.is_completed;
      });

      const studentsByBatch: Record<string, typeof students> = {};
      students.forEach((s) => {
        if (!s.batch_id) return;
        (studentsByBatch[s.batch_id] ||= []).push(s);
      });

      const attendanceByStudent: Record<string, any> = {};
      attendance.forEach((a: any) => {
        attendanceByStudent[a.student_id] = a;
      });

      const homeworkByStudent: Record<string, any[]> = {};
      homework.forEach((h: any) => {
        (homeworkByStudent[h.student_id] ||= []).push(h);
      });

      const countMissedSessions = (att: any, maxSession: number) => {
        if (!att) return 0;
        let missed = 0;
        for (let i = 1; i <= maxSession; i++) {
          const v = att[`session_${i}`];
          if (v === "absent" || v === "sick") missed++;
        }
        return missed;
      };

      const countMissedHomework = (list: any[], maxSession: number) =>
        list.filter((h) => h.session_number <= maxSession && h.completed === false).length;

      return batches.map((b): DashboardBatch => {
        const expectedSessions = b.course_type === "SAT" ? 15 : 24;
        const list = studentsByBatch[b.id] || [];
        const studentCount = list.length;

        let totalAttended = 0;
        let totalHomeworkDone = 0;
        let totalHomeworkAssigned = 0;
        const needsAttention: NeedsAttentionStudent[] = [];
        const topCandidates: TopStudent[] = [];

        list.forEach((s) => {
          const att = attendanceByStudent[s.id];
          const attended = att?.total_attended || 0;
          totalAttended += attended;
          const hw = homeworkByStudent[s.id] || [];
          const done = hw.filter((h) => h.completed === true).length;
          const assigned = hw.length;
          totalHomeworkDone += done;
          totalHomeworkAssigned += assigned;

          const missedClasses = countMissedSessions(att, expectedSessions);
          const missedHomework = countMissedHomework(hw, expectedSessions);
          if (missedClasses >= 1 && missedHomework >= 1) {
            needsAttention.push({ id: s.id, name: s.name, missedClasses, missedHomework });
          }
          topCandidates.push({ id: s.id, name: s.name, metric: attended });
        });

        const attendanceRate = studentCount
          ? Math.round((totalAttended / (studentCount * expectedSessions)) * 100)
          : 0;
        const homeworkRate = totalHomeworkAssigned
          ? Math.round((totalHomeworkDone / totalHomeworkAssigned) * 100)
          : 0;
        const avgAttended = studentCount ? totalAttended / studentCount : 0;

        needsAttention.sort(
          (a, b) => b.missedClasses + b.missedHomework - (a.missedClasses + a.missedHomework)
        );
        topCandidates.sort((a, b) => b.metric - a.metric);

        return {
          ...b,
          metrics: {
            studentCount,
            attendanceRate,
            homeworkRate,
            avgAttended,
            expectedSessions,
            needsAttention,
            topStudents: topCandidates.slice(0, 2),
            isCompleted: !!completionMap[b.id],
          },
        };
      });
    },
  });
}
