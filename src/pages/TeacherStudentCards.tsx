import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, ChevronLeft } from "lucide-react";
import { StudentCard } from "@/components/teacher/StudentCard";
import { StudentSidebar } from "@/components/teacher/StudentSidebar";
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from "framer-motion";

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
  const [isAnimating, setIsAnimating] = useState(false);
  
  const dragX = useMotionValue(0);
  
  // Next card transforms (moves to center as current drags left)
  const nextCardX = useTransform(dragX, [-200, 0], [0, 20]);
  const nextCardRotate = useTransform(dragX, [-200, 0], [0, 5]);
  const nextCardScale = useTransform(dragX, [-200, 0], [1, 0.95]);
  const nextCardOpacity = useTransform(dragX, [-200, 0], [1, 0.5]);
  
  // Current card transforms (tilts and goes behind as dragged left)
  const currentCardRotate = useTransform(dragX, [-200, 0], [-15, 0]);
  const currentCardScale = useTransform(dragX, [-200, 0], [0.95, 1]);
  
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
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      setCurrentIndex(currentIndex - 1);
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const handleNext = () => {
    if (currentIndex < students.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setCurrentIndex(currentIndex + 1);
      setTimeout(() => setIsAnimating(false), 400);
    }
  };

  const handleDragEnd = (_e: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = info.velocity.x;
    
    if ((info.offset.x > threshold || velocity > 500) && currentIndex > 0 && !isAnimating) {
      handlePrevious();
    } else if ((info.offset.x < -threshold || velocity < -500) && currentIndex < students.length - 1 && !isAnimating) {
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
  const prevStudent = currentIndex > 0 ? students[currentIndex - 1] : null;
  const nextStudent = currentIndex < students.length - 1 ? students[currentIndex + 1] : null;

  // Prepare data for the 3 cards we'll render
  const getStudentData = (index: number) => {
    if (index < 0 || index >= students.length) return null;
    return { student: students[index], index };
  };

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
            currentIndex={-1}
            onSelectStudent={setCurrentIndex}
          />
        </div>

        {/* Student Card */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-4xl relative" style={{ touchAction: 'pan-y', minHeight: '600px' }}>
            {/* Previous card (bottom of stack - static) */}
            {prevStudent && (
              <motion.div
                key={`prev-${prevStudent.id}`}
                className="absolute inset-0 pointer-events-none"
                initial={{ scale: 0.9, opacity: 0.3, y: 20 }}
                animate={{ scale: 0.9, opacity: 0.3, y: 20 }}
                style={{ zIndex: 0 }}
              >
                <StudentCard
                  student={prevStudent}
                  currentIndex={currentIndex - 1}
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

            {/* Next card (middle - animates as current is dragged) */}
            {nextStudent && (
              <motion.div
                key={`next-${nextStudent.id}`}
                className="absolute inset-0 pointer-events-none"
                style={{ 
                  zIndex: 1,
                  x: nextCardX,
                  rotate: nextCardRotate,
                  scale: nextCardScale,
                  opacity: nextCardOpacity,
                }}
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

            {/* Current card (top - draggable with Tinder-style transforms) */}
            <AnimatePresence mode="popLayout">
              <motion.div
                key={currentStudent.id}
                className="relative cursor-grab active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                style={{ 
                  x: dragX,
                  rotate: currentCardRotate,
                  scale: currentCardScale,
                  zIndex: 2,
                }}
                initial={{ opacity: 1, x: 0, rotate: 0, scale: 1 }}
                exit={{ 
                  x: currentIndex > 0 ? -400 : 400,
                  opacity: 0,
                  rotate: currentIndex > 0 ? -20 : 20,
                  transition: { duration: 0.3 }
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
