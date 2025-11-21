import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";
import { StudentCard } from "@/components/teacher/StudentCard";
import { StudentSidebar } from "@/components/teacher/StudentSidebar";
import useEmblaCarousel from "embla-carousel-react";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  batch_id: string;
}

interface Attendance {
  session_number: number;
  status: "present" | "absent" | "sick" | "late" | null;
}

interface Homework {
  session_number: number;
  completed: boolean | null;
}

interface PracticeTest {
  test_number: number;
  score: number | null;
}

interface Batch {
  id: string;
  batch_name: string;
  schedule: string;
  room: string;
  start_date: string;
}

export default function TeacherStudentCards() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    skipSnaps: false,
    duration: 20,
  });
  
  // All student data mapped by student ID
  const [studentDataMap, setStudentDataMap] = useState<Map<string, {
    attendance: Attendance[];
    homework: Homework[];
    practiceTests: PracticeTest[];
  }>>(new Map());

  useEffect(() => {
    fetchData();
  }, [batchId]);

  useEffect(() => {
    // Fetch data for all students when students list changes
    if (students.length > 0) {
      students.forEach(student => {
        fetchStudentData(student.id);
      });
    }
  }, [students]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentIndex(emblaApi.selectedScrollSnap());
      });
    }
  }, [emblaApi]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch batch
      const { data: batchData, error: batchError } = await supabase
        .from("batches")
        .select("id, batch_name, schedule, room, start_date")
        .eq("id", batchId)
        .single();

      if (batchError) throw batchError;
      setBatch(batchData);

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, first_name, last_name, phone, batch_id")
        .eq("batch_id", batchId)
        .order("first_name");

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStudentData = async (studentId: string) => {
    try {
      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .eq("batch_id", batchId)
        .single();

      const attendance: Attendance[] = [];
      if (attendanceData) {
        for (let i = 1; i <= 15; i++) {
          attendance.push({
            session_number: i,
            status: (attendanceData as any)[`session_${i}`] || null,
          });
        }
      } else {
        // Initialize empty attendance
        for (let i = 1; i <= 15; i++) {
          attendance.push({
            session_number: i,
            status: null,
          });
        }
      }

      // Fetch homework
      const { data: homeworkData } = await supabase
        .from("homework")
        .select("session_number, completed")
        .eq("student_id", studentId)
        .eq("batch_id", batchId);

      const hwMap = new Map(homeworkData?.map(h => [h.session_number, h.completed]) || []);
      const homework: Homework[] = Array.from({ length: 15 }, (_, i) => ({
        session_number: i + 1,
        completed: hwMap.has(i + 1) ? hwMap.get(i + 1)! : null,
      }));

      // Fetch practice tests
      const { data: testsData } = await supabase
        .from("practice_tests")
        .select("test_number, score")
        .eq("student_id", studentId)
        .eq("batch_id", batchId);

      const testsMap = new Map(testsData?.map(t => [t.test_number, t.score]) || []);
      const practiceTests: PracticeTest[] = Array.from({ length: 6 }, (_, i) => ({
        test_number: i + 1,
        score: testsMap.get(i + 1) || null,
      }));

      // Update the map with this student's data
      setStudentDataMap(prev => new Map(prev).set(studentId, {
        attendance,
        homework,
        practiceTests,
      }));
    } catch (error: any) {
      console.error("Error fetching student data:", error);
    }
  };

  // Calculate current week based on batch start date
  const getCurrentWeek = () => {
    if (!batch?.start_date) return 15; // Default to all sessions if no start date
    
    const startDate = new Date(batch.start_date);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    // If batch hasn't started yet (negative weeks), return 15 to check all marked sessions
    if (diffWeeks < 0) return 15;
    
    return Math.max(1, Math.min(diffWeeks + 1, 15)); // Between 1 and 15
  };

  // Calculate alert status for each student
  const getStudentAlertStatus = (studentId: string) => {
    const studentData = studentDataMap.get(studentId);
    
    if (!studentData) {
      return { hasAlert: false, missedClasses: 0, missedHomework: 0 };
    }

    const currentWeek = getCurrentWeek();
    let missedClasses = 0;
    let missedHomework = 0;

    // Check sessions up to current week, but only count those that are actually marked
    for (let i = 0; i < currentWeek && i < 15; i++) {
      const session = studentData.attendance[i];
      const hw = studentData.homework[i];
      
      // Count attendance misses only if status is explicitly marked as absent or sick
      if (session && (session.status === 'absent' || session.status === 'sick')) {
        missedClasses++;
      }
      
      // Count homework misses - only count explicitly marked as incomplete
      if (hw && hw.completed === false) {
        missedHomework++;
      }
    }

    const hasAlert = missedClasses >= 3 || missedHomework >= 3;
    return { hasAlert, missedClasses, missedHomework };
  };

  const handlePrevious = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const handleNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleUpdateStudent = async (updates: Partial<Student>) => {
    const currentStudent = students[currentIndex];
    try {
      const { error } = await supabase
        .from("students")
        .update(updates)
        .eq("id", currentStudent.id);

      if (error) throw error;

      setStudents(students.map(s => 
        s.id === currentStudent.id ? { ...s, ...updates } : s
      ));

      toast({
        title: "Success",
        description: "Student info updated",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleAttendanceChange = async (sessionNumber: number, status: string) => {
    const currentStudent = students[currentIndex];
    try {
      const { error } = await supabase
        .from("attendance")
        .upsert({
          student_id: currentStudent.id,
          batch_id: batchId,
          [`session_${sessionNumber}`]: status,
        }, {
          onConflict: "student_id,batch_id",
        });

      if (error) throw error;

      // Update the student data map
      const studentData = studentDataMap.get(currentStudent.id);
      if (studentData) {
        setStudentDataMap(prev => new Map(prev).set(currentStudent.id, {
          ...studentData,
          attendance: studentData.attendance.map(a =>
            a.session_number === sessionNumber ? { ...a, status: status as any } : a
          ),
        }));
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleHomeworkChange = async (sessionNumber: number, completed: boolean) => {
    const currentStudent = students[currentIndex];
    try {
      const { error } = await supabase
        .from("homework")
        .upsert({
          student_id: currentStudent.id,
          batch_id: batchId,
          session_number: sessionNumber,
          completed,
        }, {
          onConflict: "student_id,session_number",
        });

      if (error) throw error;

      // Update the student data map
      const studentData = studentDataMap.get(currentStudent.id);
      if (studentData) {
        setStudentDataMap(prev => new Map(prev).set(currentStudent.id, {
          ...studentData,
          homework: studentData.homework.map(h =>
            h.session_number === sessionNumber ? { ...h, completed } : h
          ),
        }));
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleTestScoreChange = async (testNumber: number, score: number | null) => {
    const currentStudent = students[currentIndex];
    try {
      if (score === null) {
        await supabase
          .from("practice_tests")
          .delete()
          .eq("student_id", currentStudent.id)
          .eq("test_number", testNumber);
      } else {
        const { error } = await supabase
          .from("practice_tests")
          .upsert({
            student_id: currentStudent.id,
            batch_id: batchId,
            test_number: testNumber,
            score,
          }, {
            onConflict: "student_id,test_number",
          });

        if (error) throw error;
      }

      // Update the student data map
      const studentData = studentDataMap.get(currentStudent.id);
      if (studentData) {
        setStudentDataMap(prev => new Map(prev).set(currentStudent.id, {
          ...studentData,
          practiceTests: studentData.practiceTests.map(t =>
            t.test_number === testNumber ? { ...t, score } : t
          ),
        }));
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={() => navigate("/teacher/dashboard")}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to My Classes
        </Button>
        <div className="text-center mt-12">
          <p className="text-muted-foreground">No students in this batch yet.</p>
        </div>
      </div>
    );
  }

  const currentStudent = students[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <Button variant="ghost" onClick={() => navigate("/teacher/dashboard")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to My Classes
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-60px)]">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden lg:block">
          <StudentSidebar
            students={students}
            currentIndex={currentIndex}
            onSelectStudent={(index) => {
              setCurrentIndex(index);
              if (emblaApi) emblaApi.scrollTo(index);
            }}
            batch={batch}
            getStudentAlertStatus={getStudentAlertStatus}
          />
        </div>

        {/* Student Card Carousel */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl">
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {students.map((student, index) => {
                  const studentData = studentDataMap.get(student.id);
                  const alertStatus = getStudentAlertStatus(student.id);
                  return (
                    <div key={student.id} className="flex-[0_0_100%] min-w-0 px-4">
                      <Card className={alertStatus.hasAlert ? "shadow-lg border-2 border-destructive" : "shadow-lg"}>
                        {alertStatus.hasAlert && (
                          <div className="p-4 bg-destructive/10 border-b border-destructive/30">
                            <p className="text-sm font-medium text-destructive">
                              ⚠️ Alert: 
                              {alertStatus.missedClasses >= 3 && ` ${alertStatus.missedClasses} classes missed`}
                              {alertStatus.missedClasses >= 3 && alertStatus.missedHomework >= 3 && ' •'}
                              {alertStatus.missedHomework >= 3 && ` ${alertStatus.missedHomework} homework incomplete`}
                            </p>
                          </div>
                        )}
                        <StudentCard
                          student={student}
                          currentIndex={index}
                          totalStudents={students.length}
                          attendance={studentData?.attendance || []}
                          homework={studentData?.homework || []}
                          practiceTests={studentData?.practiceTests || []}
                          onUpdateStudent={handleUpdateStudent}
                          onAttendanceChange={handleAttendanceChange}
                          onHomeworkChange={handleHomeworkChange}
                          onTestScoreChange={handleTestScoreChange}
                        />
                      </Card>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="min-w-[160px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={handleNext}
                disabled={currentIndex === students.length - 1}
                className="min-w-[160px] bg-primary"
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
