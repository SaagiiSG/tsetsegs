import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Phone, ArrowRight } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  batch_id: string;
}

interface Batch {
  id: string;
  batch_name: string;
  start_date: string;
}

interface StudentAlert {
  student: Student;
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
  const navigate = useNavigate();

  useEffect(() => {
    if (teacherName) {
      fetchAlerts();
    }
  }, [teacherName]);

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      console.log('Fetching alerts for teacher:', teacherName);
      
      // Fetch all batches for this teacher
      const { data: batches, error: batchesError } = await supabase
        .from('batches')
        .select('id, batch_name, start_date')
        .eq('teacher', teacherName);

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
        .select('id, first_name, last_name, phone, batch_id')
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

      console.log('Attendance data:', attendance);
      console.log('Homework data:', homework);
      
      if (attendanceError) throw attendanceError;
      if (homeworkError) throw homeworkError;

      // Calculate alerts for each student
      const studentAlerts: StudentAlert[] = [];

      for (const student of students) {
        const batch = batches.find(b => b.id === student.batch_id);
        if (!batch) continue;

        const studentAttendance = attendance?.filter(a => a.student_id === student.id) || [];
        const studentHomework = homework?.filter(h => h.student_id === student.id) || [];

        console.log(`Checking student ${student.first_name}:`, {
          attendance: studentAttendance,
          homework: studentHomework
        });

        // Calculate current week based on batch start date
        const startDate = new Date(batch.start_date);
        const today = new Date();
        const weeksPassed = Math.floor((today.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const currentWeek = Math.max(1, Math.min(weeksPassed + 1, 15));

        console.log(`Current week for ${student.first_name}: ${currentWeek}`);

        // Count missed classes (only marked sessions up to current week)
        let missedClasses = 0;
        for (const att of studentAttendance) {
          for (let i = 1; i <= currentWeek; i++) {
            const sessionKey = `session_${i}` as keyof typeof att;
            const status = att[sessionKey];
            if (status === 'absent') {
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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
              <AlertTriangle className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-lg font-semibold">All Clear! 🎉</h3>
            <p className="text-muted-foreground">
              No students currently need attention. Great work!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Found {alerts.length} student{alerts.length !== 1 ? 's' : ''} needing attention
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {alerts.map((alert) => (
          <Card key={alert.student.id} className="border-2 border-destructive/20 hover:shadow-lg transition-shadow">
            <CardContent className="p-4 space-y-3">
              {/* Student Name */}
              <div>
                <h3 className="font-bold text-lg">
                  {alert.student.first_name} {alert.student.last_name ? alert.student.last_name.charAt(0) + '.' : ''}
                </h3>
                <p className="text-sm text-muted-foreground">{alert.batch.batch_name}</p>
              </div>

              {/* Alert Badges */}
              <div className="flex flex-wrap gap-2">
                {alert.missedClasses >= 3 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {alert.missedClasses} classes missed
                  </Badge>
                )}
                {alert.missedHomework >= 3 && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {alert.missedHomework} homework incomplete
                  </Badge>
                )}
              </div>

              {/* Contact Info */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{alert.student.phone}</span>
              </div>

              {/* View Student Button */}
              <Button
                size="sm"
                className="w-full"
                onClick={() => navigate(`/teacher/students/${alert.batch.id}`)}
              >
                View Student
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
