import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";
import { StudentCard } from "@/components/teacher/StudentCard";
import { StudentSidebar } from "@/components/teacher/StudentSidebar";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

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
  completed: boolean;
}

interface PracticeTest {
  test_number: number;
  score: number | null;
}

interface Batch {
  id: string;
  batch_name: string;
}

export default function TeacherStudentCards() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  
  // Current student data
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [practiceTests, setPracticeTests] = useState<PracticeTest[]>([]);

  useEffect(() => {
    fetchData();
  }, [batchId]);

  useEffect(() => {
    if (students.length > 0) {
      fetchStudentData(students[currentIndex].id);
    }
  }, [currentIndex, students]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch batch
      const { data: batchData, error: batchError } = await supabase
        .from("batches")
        .select("id, batch_name")
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

      if (attendanceData) {
        const attendanceArray: Attendance[] = [];
        for (let i = 1; i <= 15; i++) {
          attendanceArray.push({
            session_number: i,
            status: (attendanceData as any)[`session_${i}`] || null,
          });
        }
        setAttendance(attendanceArray);
      } else {
        // Initialize empty attendance
        setAttendance(Array.from({ length: 15 }, (_, i) => ({
          session_number: i + 1,
          status: null,
        })));
      }

      // Fetch homework
      const { data: homeworkData } = await supabase
        .from("homework")
        .select("session_number, completed")
        .eq("student_id", studentId)
        .eq("batch_id", batchId);

      const hwMap = new Map(homeworkData?.map(h => [h.session_number, h.completed]) || []);
      setHomework(Array.from({ length: 15 }, (_, i) => ({
        session_number: i + 1,
        completed: hwMap.get(i + 1) || false,
      })));

      // Fetch practice tests
      const { data: testsData } = await supabase
        .from("practice_tests")
        .select("test_number, score")
        .eq("student_id", studentId)
        .eq("batch_id", batchId);

      const testsMap = new Map(testsData?.map(t => [t.test_number, t.score]) || []);
      setPracticeTests(Array.from({ length: 6 }, (_, i) => ({
        test_number: i + 1,
        score: testsMap.get(i + 1) || null,
      })));
    } catch (error: any) {
      console.error("Error fetching student data:", error);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setDirection("right");
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < students.length - 1) {
      setDirection("left");
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleDragEnd = (_e: any, info: PanInfo) => {
    const threshold = 100;
    
    if (info.offset.x > threshold && currentIndex > 0) {
      handlePrevious();
    } else if (info.offset.x < -threshold && currentIndex < students.length - 1) {
      handleNext();
    }
  };

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

      setAttendance(attendance.map(a =>
        a.session_number === sessionNumber ? { ...a, status: status as any } : a
      ));
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

      setHomework(homework.map(h =>
        h.session_number === sessionNumber ? { ...h, completed } : h
      ));
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

      setPracticeTests(practiceTests.map(t =>
        t.test_number === testNumber ? { ...t, score } : t
      ));
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
  const nextStudent = currentIndex < students.length - 1 ? students[currentIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate("/teacher/dashboard")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to My Classes
            </Button>
            <div className="text-center">
              <h1 className="text-lg font-semibold">{batch?.batch_name}</h1>
              <p className="text-sm text-muted-foreground">{students.length} Students</p>
            </div>
            <div className="w-32" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar - Hidden on mobile */}
        <div className="hidden lg:block">
          <StudentSidebar
            students={students}
            currentIndex={currentIndex}
            onSelectStudent={setCurrentIndex}
          />
        </div>

        {/* Student Card */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl relative" style={{ touchAction: 'pan-y', minHeight: '600px' }}>
            {/* Next card preview (behind) */}
            {nextStudent && (
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 0 }}
                initial={{ scale: 0.95, x: 25, opacity: 0.4, rotate: 20 }}
                animate={{ scale: 0.95, x: 25, opacity: 0.4, rotate: 20 }}
              >
                <StudentCard
                  student={nextStudent}
                  currentIndex={currentIndex + 1}
                  totalStudents={students.length}
                  attendance={[]}
                  homework={[]}
                  practiceTests={[]}
                  onUpdateStudent={() => {}}
                  onAttendanceChange={() => {}}
                  onHomeworkChange={() => {}}
                  onTestScoreChange={() => {}}
                />
              </motion.div>
            )}

            {/* Current card */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStudent.id}
                className="relative cursor-grab"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                initial={{
                  opacity: direction === "left" ? 0.4 : 0,
                  x: direction === "left" ? 25 : direction === "right" ? -300 : 0,
                  scale: direction === "left" ? 0.95 : 0.9,
                  rotate: direction === "left" ? 20 : 0,
                  zIndex: 1,
                }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scale: 1,
                  rotate: 0,
                  zIndex: 1,
                }}
                exit={{
                  opacity: 0,
                  x: direction === "left" ? -300 : 300,
                  scale: 0.9,
                  rotate: direction === "left" ? -20 : 20,
                  zIndex: 0,
                }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 30,
                }}
                whileDrag={{
                  cursor: "grabbing",
                  zIndex: 2,
                }}
              >
                <StudentCard
                  student={currentStudent}
                  currentIndex={currentIndex}
                  totalStudents={students.length}
                  attendance={attendance}
                  homework={homework}
                  practiceTests={practiceTests}
                  onUpdateStudent={handleUpdateStudent}
                  onAttendanceChange={handleAttendanceChange}
                  onHomeworkChange={handleHomeworkChange}
                  onTestScoreChange={handleTestScoreChange}
                />
              </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons - Hidden on mobile (swipe instead) */}
            <div className="hidden md:flex justify-center gap-4 mt-6">
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="min-w-[160px]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous Student
              </Button>
              <Button
                variant="default"
                size="lg"
                onClick={handleNext}
                disabled={currentIndex === students.length - 1}
                className="min-w-[160px] bg-primary"
              >
                Next Student
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            {/* Mobile swipe hint */}
            <div className="md:hidden text-center mt-4 text-sm text-muted-foreground">
              Drag or swipe cards to navigate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
