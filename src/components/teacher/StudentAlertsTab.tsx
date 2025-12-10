import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { StudentCard } from './StudentCard';
import { toast } from 'sonner';

interface DbStudent {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  parent_phone: string | null;
  batch_id: string;
  english_level: string | null;
  math_level: string | null;
  first_session_completed: boolean | null;
}

interface DbAttendance {
  id: string;
  student_id: string;
  batch_id: string;
  session_1: string | null;
  session_2: string | null;
  session_3: string | null;
  session_4: string | null;
  session_5: string | null;
  session_6: string | null;
  session_7: string | null;
  session_8: string | null;
  session_9: string | null;
  session_10: string | null;
  session_11: string | null;
  session_12: string | null;
  session_13: string | null;
  session_14: string | null;
  session_15: string | null;
}

interface DbHomework {
  id: string;
  student_id: string;
  batch_id: string;
  session_number: number;
  completed: boolean;
}

interface DbPracticeTest {
  id: string;
  student_id: string;
  batch_id: string;
  test_number: number;
  score: number | null;
}

interface Batch {
  id: string;
  batch_name: string;
  start_date: string;
  course_type: 'SAT' | 'IELTS';
}

interface StudentAlert {
  student: DbStudent;
  batch: Batch;
  missedClasses: number;
  missedHomework: number;
}

interface StudentAlertsTabProps {
  teacherName: string;
}

export function StudentAlertsTab({ teacherName }: StudentAlertsTabProps) {
  const [alerts, setAlerts] = useState<StudentAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (teacherName) {
      fetchAlerts();
    }
  }, [teacherName]);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching alerts for teacher:', teacherName);
      
      // Fetch all batches for this teacher (use ilike for multi-teacher IELTS batches)
      const { data: batches, error: batchesError } = await supabase
        .from('batches')
        .select('id, batch_name, start_date, course_type')
        .ilike('teacher', `%${teacherName}%`);

      console.log('Batches fetched:', batches);
      if (batchesError) throw batchesError;
      if (!batches || batches.length === 0) {
        console.log('No batches found');
        setAlerts([]);
        setIsLoading(false);
        return;
      }

      const batchIds = batches.map(b => b.id);

      // Fetch all students in these batches
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .in('batch_id', batchIds);

      console.log('Students fetched:', students);
      if (studentsError) throw studentsError;
      if (!students || students.length === 0) {
        console.log('No students found');
        setAlerts([]);
        setIsLoading(false);
        return;
      }

      // Fetch attendance and homework for all students
      const studentIds = students.map(s => s.id);

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance')
        .select('*')
        .in('student_id', studentIds);

      const { data: homework, error: homeworkError } = await supabase
        .from('homework')
        .select('*')
        .in('student_id', studentIds);

      const { data: practiceTests, error: practiceTestsError } = await supabase
        .from('practice_tests')
        .select('*')
        .in('student_id', studentIds);

      console.log('Attendance data:', attendance);
      console.log('Homework data:', homework);
      console.log('Practice tests data:', practiceTests);
      
      if (attendanceError) throw attendanceError;
      if (homeworkError) throw homeworkError;
      if (practiceTestsError) throw practiceTestsError;

      // Calculate alerts for each student
      const studentAlerts: StudentAlert[] = [];

      for (const student of students) {
        const batch = batches.find(b => b.id === student.batch_id);
        if (!batch) continue;

        const studentAttendance = attendance?.filter(a => a.student_id === student.id) || [];
        const studentHomework = homework?.filter(h => h.student_id === student.id) || [];
        const studentPracticeTests = practiceTests?.filter(pt => pt.student_id === student.id) || [];

        console.log(`Checking student ${student.first_name}:`, {
          attendance: studentAttendance,
          homework: studentHomework,
          practiceTests: studentPracticeTests
        });

        // Calculate current week based on batch start date
        const startDate = new Date(batch.start_date);
        const today = new Date();
        const weeksPassed = Math.floor((today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        // If batch hasn't started yet or just started, we still need to check the marked sessions
        // So we use at least week 15 to check all marked sessions
        const currentWeek = 15; // Check all 15 sessions regardless of calendar week

        console.log(`Current week for ${student.first_name}: ${currentWeek}, weeksPassed: ${weeksPassed}`);

        // Count missed classes (only marked sessions up to current week)
        let missedClasses = 0;
        for (const att of studentAttendance) {
          for (let i = 1; i <= currentWeek; i++) {
            const sessionKey = `session_${i}` as keyof typeof att;
            const status = att[sessionKey];
            // Count absent and sick as missed classes (excused doesn't count)
            if (status === 'absent' || status === 'sick') {
              missedClasses++;
            }
          }
        }

        // Count incomplete homework (only up to current week)
        const missedHomework = studentHomework.filter(
          hw => hw.session_number <= currentWeek && hw.completed === false
        ).length;

        console.log(`${student.first_name} - Missed classes: ${missedClasses}, Missed homework: ${missedHomework}`);

        // Add to alerts if student has 3+ misses
        if (missedClasses >= 3 || missedHomework >= 3) {
          console.log(`Adding ${student.first_name} to alerts!`);
          studentAlerts.push({
            student,
            batch,
            missedClasses,
            missedHomework,
          });
        }
      }

      console.log('Final alerts:', studentAlerts);

      // Sort by total issues (most critical first)
      studentAlerts.sort((a, b) => {
        const totalA = a.missedClasses + a.missedHomework;
        const totalB = b.missedClasses + b.missedHomework;
        return totalB - totalA;
      });

      setAlerts(studentAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper functions to transform DB data to StudentCard format
  const transformAttendance = (dbAttendance: DbAttendance[]): any[] => {
    if (!dbAttendance[0]) return [];
    const record = dbAttendance[0];
    const result = [];
    for (let i = 1; i <= 15; i++) {
      const key = `session_${i}` as keyof DbAttendance;
      result.push({
        session_number: i,
        status: record[key] as any,
      });
    }
    return result;
  };

  const transformHomework = (dbHomework: DbHomework[]): any[] => {
    return dbHomework.map(hw => ({
      session_number: hw.session_number,
      status: hw.completed ? 'completed' : 'incomplete',
    }));
  };

  const transformPracticeTests = (dbTests: DbPracticeTest[]): any[] => {
    return dbTests.map(test => ({
      test_number: test.test_number,
      score: test.score,
    }));
  };

  const getAlertData = async (studentId: string, batchId: string) => {
    const { data: attendance } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .eq('batch_id', batchId);

    const { data: homework } = await supabase
      .from('homework')
      .select('*')
      .eq('student_id', studentId)
      .eq('batch_id', batchId);

    const { data: practiceTests } = await supabase
      .from('practice_tests')
      .select('*')
      .eq('student_id', studentId)
      .eq('batch_id', batchId);

    return {
      attendance: transformAttendance(attendance || []),
      homework: transformHomework(homework || []),
      practiceTests: transformPracticeTests(practiceTests || []),
    };
  };

  const [alertsData, setAlertsData] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadAlertsData = async () => {
      const data: Record<string, any> = {};
      for (const alert of alerts) {
        const key = alert.student.id;
        data[key] = await getAlertData(alert.student.id, alert.batch.id);
      }
      setAlertsData(data);
    };

    if (alerts.length > 0) {
      loadAlertsData();
    }
  }, [alerts]);

  const handleUpdateStudent = async (studentId: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', studentId);

      if (error) throw error;

      setAlerts(prevAlerts =>
        prevAlerts.map(alert =>
          alert.student.id === studentId
            ? { ...alert, student: { ...alert.student, ...updates } }
            : alert
        )
      );
      toast.success('Student updated');
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student');
    }
  };

  const handleAttendanceChange = async (
    studentId: string,
    batchId: string,
    session: number,
    status: string
  ) => {
    try {
      const { data: attendanceRecord } = await supabase
        .from('attendance')
        .select('id')
        .eq('student_id', studentId)
        .eq('batch_id', batchId)
        .single();
      
      if (attendanceRecord) {
        const { error } = await supabase
          .from('attendance')
          .update({ [`session_${session}`]: status })
          .eq('id', attendanceRecord.id);

        if (error) throw error;
      }
      
      // Refresh data
      const data = await getAlertData(studentId, batchId);
      setAlertsData(prev => ({ ...prev, [studentId]: data }));
      fetchAlerts();
    } catch (error) {
      console.error('Error updating attendance:', error);
      toast.error('Failed to update attendance');
    }
  };

  const handleHomeworkChange = async (
    studentId: string,
    batchId: string,
    sessionNumber: number,
    status: string
  ) => {
    try {
      const completed = status === 'completed';
      const { data: homeworkRecord } = await supabase
        .from('homework')
        .select('id')
        .eq('student_id', studentId)
        .eq('batch_id', batchId)
        .eq('session_number', sessionNumber)
        .maybeSingle();
      
      if (!homeworkRecord) {
        const { error } = await supabase
          .from('homework')
          .insert({
            student_id: studentId,
            batch_id: batchId,
            session_number: sessionNumber,
            completed,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('homework')
          .update({ completed })
          .eq('id', homeworkRecord.id);

        if (error) throw error;
      }

      // Refresh data
      const data = await getAlertData(studentId, batchId);
      setAlertsData(prev => ({ ...prev, [studentId]: data }));
      fetchAlerts();
    } catch (error) {
      console.error('Error updating homework:', error);
      toast.error('Failed to update homework');
    }
  };

  const handleTestScoreChange = async (
    studentId: string,
    batchId: string,
    testNumber: number,
    score: number | null
  ) => {
    try {
      const { data: testRecord } = await supabase
        .from('practice_tests')
        .select('id')
        .eq('student_id', studentId)
        .eq('batch_id', batchId)
        .eq('test_number', testNumber)
        .maybeSingle();
      
      if (!testRecord) {
        const { error } = await supabase
          .from('practice_tests')
          .insert({
            student_id: studentId,
            batch_id: batchId,
            test_number: testNumber,
            score,
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('practice_tests')
          .update({ score })
          .eq('id', testRecord.id);

        if (error) throw error;
      }

      // Refresh data
      const data = await getAlertData(studentId, batchId);
      setAlertsData(prev => ({ ...prev, [studentId]: data }));
    } catch (error) {
      console.error('Error updating test score:', error);
      toast.error('Failed to update test score');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6 md:py-12">
        <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="py-6 md:py-8 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-2.5">
            <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-green-600 dark:text-green-500" />
          </div>
          <h3 className="text-sm md:text-base font-semibold">All Clear! 🎉</h3>
          <p className="text-xs md:text-sm text-muted-foreground">No students need attention</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <p className="text-xs md:text-sm text-muted-foreground">
        {alerts.length} student{alerts.length !== 1 ? 's' : ''} need attention
      </p>

      <div className="space-y-4 md:space-y-6">
        {alerts.map((alert, index) => {
          const data = alertsData[alert.student.id];
          if (!data) return null;

          return (
            <div key={alert.student.id} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span>{alert.batch.batch_name}</span>
              </div>
              <StudentCard
                student={{
                  id: alert.student.id,
                  first_name: alert.student.first_name,
                  last_name: alert.student.last_name || '',
                  phone: alert.student.phone,
                  parent_phone: alert.student.parent_phone || undefined,
                  math_level: alert.student.math_level as any,
                  english_level: alert.student.english_level as any,
                  first_session_completed: alert.student.first_session_completed || false,
                }}
                currentIndex={index}
                totalStudents={alerts.length}
                attendance={data.attendance}
                homework={data.homework}
                practiceTests={data.practiceTests}
                hasAlert={true}
                missedClasses={alert.missedClasses}
                missedHomework={alert.missedHomework}
                courseType={alert.batch.course_type}
                batchId={alert.batch.id}
                teacherName={teacherName}
                onUpdateStudent={(updates) => handleUpdateStudent(alert.student.id, updates)}
                onAttendanceChange={(session, status) => handleAttendanceChange(alert.student.id, alert.batch.id, session, status)}
                onHomeworkChange={(session, status) => handleHomeworkChange(alert.student.id, alert.batch.id, session, status)}
                onTestScoreChange={(testNumber, score) => handleTestScoreChange(alert.student.id, alert.batch.id, testNumber, score)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
