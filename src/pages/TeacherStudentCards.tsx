import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, ChevronLeft, UserPlus } from "lucide-react";
import { StudentCard } from "@/components/teacher/StudentCard";
import { StudentSidebar } from "@/components/teacher/StudentSidebar";
import { BatchFirstSessionIntake } from "@/components/teacher/BatchFirstSessionIntake";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import useEmblaCarousel from "embla-carousel-react";
import { useIsTablet } from "@/hooks/use-mobile";
import { z } from "zod";

interface Student {
  id: string;
  name?: string;
  first_name: string;
  last_name: string;
  phone: string;
  parent_phone?: string;
  grade?: string;
  school_name?: string;
  math_level?: 'bad' | 'average' | 'good' | 'B1' | 'B2' | 'C1' | 'C2' | string;
  english_level?: 'bad' | 'average' | 'good' | 'B1' | 'B2' | 'C1' | 'C2' | string;
  first_session_completed?: boolean;
  batch_id: string;
}

interface Attendance {
  session_number: number;
  status: "present" | "absent" | "sick" | "late" | "excused" | null;
}

interface Homework {
  session_number: number;
  status: "completed" | "incomplete" | null;
}

interface PracticeTest {
  test_number: number;
  score: number | null;
  listening?: number | null;
  reading?: number | null;
  writing?: number | null;
  speaking?: number | null;
}

interface Batch {
  id: string;
  batch_name: string;
  schedule: string;
  room: string;
  start_date: string;
  course_type: 'SAT' | 'IELTS';
}

export default function TeacherStudentCards() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { teacherName } = useTeacherAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showBatchIntake, setShowBatchIntake] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showScoreCalculator, setShowScoreCalculator] = useState(false);
  const [newStudentData, setNewStudentData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    parent_phone: "",
    grade: "",
    school_name: "",
    math_level: "",
    english_level: "",
  });
  const isTablet = useIsTablet();

  // Validation schema for new student
  const createStudentSchema = (courseType: 'SAT' | 'IELTS') => {
    const baseSchema = {
      first_name: z.string().trim().min(1, "First name is required").max(100, "First name too long"),
      last_name: z.string().trim().min(1, "Last name is required").max(100, "Last name too long"),
      phone: z.string().regex(/^\d{8}$/, "Phone must be exactly 8 digits"),
      parent_phone: z.string().regex(/^\d{8}$/, "Parent phone must be exactly 8 digits"),
      grade: z.string().trim().min(1, "Grade is required").max(50, "Grade too long"),
      school_name: z.string().trim().min(1, "School name is required").max(200, "School name too long"),
    };

    if (courseType === 'SAT') {
      return z.object({
        ...baseSchema,
        math_level: z.enum(['bad', 'average', 'good'], { required_error: "Math level is required" }),
        english_level: z.enum(['bad', 'average', 'good'], { required_error: "English level is required" }),
      });
    } else {
      return z.object({
        ...baseSchema,
        english_level: z.enum(['B1', 'B2', 'C1', 'C2'], { required_error: "English level is required" }),
      });
    }
  };
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: false, 
    skipSnaps: false,
    duration: 20,
    align: 'center',
    containScroll: 'trimSnaps',
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
        .select("id, batch_name, schedule, room, start_date, course_type")
        .eq("id", batchId)
        .single();

      if (batchError) throw batchError;
      setBatch(batchData);

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("id, name, first_name, last_name, phone, parent_phone, grade, school_name, math_level, english_level, first_session_completed, batch_id")
        .eq("batch_id", batchId)
        .order("first_name");

      if (studentsError) throw studentsError;
      setStudents((studentsData || []) as Student[]);
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
      const maxSessions = batch?.course_type === 'IELTS' ? 24 : 15;
      const maxTests = batch?.course_type === 'IELTS' ? 8 : 8;

      // Fetch attendance
      const { data: attendanceData } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", studentId)
        .eq("batch_id", batchId)
        .single();

      const attendance: Attendance[] = [];
      if (attendanceData) {
        for (let i = 1; i <= maxSessions; i++) {
          attendance.push({
            session_number: i,
            status: (attendanceData as any)[`session_${i}`] || null,
          });
        }
      } else {
        // Initialize empty attendance
        for (let i = 1; i <= maxSessions; i++) {
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
      const homework: Homework[] = Array.from({ length: maxSessions }, (_, i) => ({
        session_number: i + 1,
        status: hwMap.has(i + 1) ? (hwMap.get(i + 1) ? "completed" : "incomplete") : null,
      }));

      // Fetch practice tests
      const { data: testsData } = await supabase
        .from("practice_tests")
        .select("test_number, score, listening, reading, writing, speaking")
        .eq("student_id", studentId)
        .eq("batch_id", batchId);

      const testsMap = new Map(testsData?.map(t => [t.test_number, t]) || []);
      const practiceTests: PracticeTest[] = Array.from({ length: maxTests }, (_, i) => {
        const testData = testsMap.get(i + 1);
        return {
          test_number: i + 1,
          score: testData?.score || null,
          listening: testData?.listening || null,
          reading: testData?.reading || null,
          writing: testData?.writing || null,
          speaking: testData?.speaking || null,
        };
      });

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
    const maxWeeks = batch?.course_type === 'IELTS' ? 24 : 15;
    if (!batch?.start_date) return maxWeeks; // Default to all sessions if no start date
    
    const startDate = new Date(batch.start_date);
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    
    // If batch hasn't started yet (negative weeks), return maxWeeks to check all marked sessions
    if (diffWeeks < 0) return maxWeeks;
    
    return Math.max(1, Math.min(diffWeeks + 1, maxWeeks)); // Between 1 and maxWeeks
  };

  // Calculate alert status for each student
  const getStudentAlertStatus = (studentId: string) => {
    const studentData = studentDataMap.get(studentId);
    
    if (!studentData) {
      return { hasAlert: false, missedClasses: 0, missedHomework: 0 };
    }

    const currentWeek = getCurrentWeek();
    const maxSessions = batch?.course_type === 'IELTS' ? 24 : 15;
    let missedClasses = 0;
    let missedHomework = 0;

    // Check sessions up to current week, but only count those that are actually marked
    for (let i = 0; i < currentWeek && i < maxSessions; i++) {
      const session = studentData.attendance[i];
      const hw = studentData.homework[i];
      
      // Count attendance misses only if status is explicitly marked as absent or sick
      if (session && (session.status === 'absent' || session.status === 'sick')) {
        missedClasses++;
      }
      
      // Count homework misses - only count explicitly marked as incomplete
      if (hw && hw.status === 'incomplete') {
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

  const handleHomeworkChange = async (sessionNumber: number, status: string) => {
    const currentStudent = students[currentIndex];
    try {
      const completed = status === "completed";
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
            h.session_number === sessionNumber ? { ...h, status: status as any } : h
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

  const handleTestScoreChange = async (testNumber: number, score: number | null, skills?: { listening?: number | null; reading?: number | null; writing?: number | null; speaking?: number | null }) => {
    const currentStudent = students[currentIndex];
    try {
      // Both SAT and IELTS now use single score approach
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

  const handleBatchIntakeSubmit = async (studentId: string, data: {
    phone: string;
    parent_phone: string;
    last_name: string;
    grade: string;
    school_name: string;
    math_level?: 'bad' | 'average' | 'good';
    english_level: 'bad' | 'average' | 'good' | 'B1' | 'B2' | 'C1' | 'C2';
  }) => {
    try {
      const updateData: any = {
        phone: data.phone,
        parent_phone: data.parent_phone,
        last_name: data.last_name,
        grade: data.grade,
        school_name: data.school_name,
        english_level: data.english_level,
        first_session_completed: true,
      };

      // Add math_level only for SAT
      if (data.math_level) {
        updateData.math_level = data.math_level;
      }

      const { error } = await supabase
        .from("students")
        .update(updateData)
        .eq("id", studentId);

      if (error) throw error;

      // Update local state
      setStudents(students.map(s => 
        s.id === studentId 
          ? { 
              ...s, 
              phone: data.phone,
              parent_phone: data.parent_phone,
              last_name: data.last_name,
              grade: data.grade,
              school_name: data.school_name,
              math_level: data.math_level,
              english_level: data.english_level,
              first_session_completed: true 
            } 
          : s
      ));

      toast({
        title: "Success",
        description: "First session data saved successfully",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
      throw error;
    }
  };

  const handleAddStudent = async () => {
    if (!batch) return;

    try {
      // Validate input
      const schema = createStudentSchema(batch.course_type);
      const validationResult = schema.safeParse(newStudentData);

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: firstError.message,
        });
        return;
      }

      const uniqueLinkId = Math.random().toString(36).substring(2, 15);
      
      const insertData: any = {
        first_name: newStudentData.first_name.trim(),
        last_name: newStudentData.last_name.trim(),
        name: `${newStudentData.first_name.trim()} ${newStudentData.last_name.trim()}`,
        phone: newStudentData.phone.trim(),
        parent_phone: newStudentData.parent_phone.trim(),
        grade: newStudentData.grade.trim(),
        school_name: newStudentData.school_name.trim(),
        english_level: newStudentData.english_level,
        batch_id: batchId,
        unique_link_id: uniqueLinkId,
        first_session_completed: true,
      };

      // Add math_level only for SAT
      if (batch.course_type === 'SAT') {
        insertData.math_level = newStudentData.math_level;
      }

      const { data, error } = await supabase
        .from("students")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      // Refresh students list
      await fetchData();
      
      setShowAddStudent(false);
      setNewStudentData({
        first_name: "",
        last_name: "",
        phone: "",
        parent_phone: "",
        grade: "",
        school_name: "",
        math_level: "",
        english_level: "",
      });
      
      toast({
        title: "Success",
        description: "Student added successfully with complete information",
      });
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

  return (
    <div className="min-h-screen bg-background">
      {/* Batch Intake Modal */}
      {showBatchIntake && batch && (
        <BatchFirstSessionIntake
          students={students}
          courseType={batch.course_type}
          onClose={() => setShowBatchIntake(false)}
          onSubmit={handleBatchIntakeSubmit}
        />
      )}

      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/teacher/dashboard")}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to My Classes
          </Button>
          <div className="flex gap-2">
            <Dialog open={showAddStudent} onOpenChange={setShowAddStudent}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Add New Student - {batch?.course_type}</DialogTitle>
                  <DialogDescription>
                    Add a new student with complete information to this {batch?.course_type} class.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first_name">First Name *</Label>
                        <Input
                          id="first_name"
                          value={newStudentData.first_name}
                          onChange={(e) => setNewStudentData({ ...newStudentData, first_name: e.target.value })}
                          placeholder="Student's first name"
                          maxLength={100}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last_name">Last Name *</Label>
                        <Input
                          id="last_name"
                          value={newStudentData.last_name}
                          onChange={(e) => setNewStudentData({ ...newStudentData, last_name: e.target.value })}
                          placeholder="Student's last name"
                          maxLength={100}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number * (8 digits)</Label>
                        <Input
                          id="phone"
                          value={newStudentData.phone}
                          onChange={(e) => setNewStudentData({ ...newStudentData, phone: e.target.value.replace(/\D/g, '') })}
                          placeholder="12345678"
                          maxLength={8}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="parent_phone">Parent Phone * (8 digits)</Label>
                        <Input
                          id="parent_phone"
                          value={newStudentData.parent_phone}
                          onChange={(e) => setNewStudentData({ ...newStudentData, parent_phone: e.target.value.replace(/\D/g, '') })}
                          placeholder="12345678"
                          maxLength={8}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="grade">Grade *</Label>
                        <Input
                          id="grade"
                          value={newStudentData.grade}
                          onChange={(e) => setNewStudentData({ ...newStudentData, grade: e.target.value })}
                          placeholder="e.g., 10th, 11th, 12th"
                          maxLength={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="school_name">School Name *</Label>
                        <Input
                          id="school_name"
                          value={newStudentData.school_name}
                          onChange={(e) => setNewStudentData({ ...newStudentData, school_name: e.target.value })}
                          placeholder="School name"
                          maxLength={200}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {batch?.course_type === 'SAT' && (
                        <div className="space-y-2">
                          <Label htmlFor="math_level">Math Level *</Label>
                          <Select
                            value={newStudentData.math_level}
                            onValueChange={(value) => setNewStudentData({ ...newStudentData, math_level: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select math level" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bad">Needs Work</SelectItem>
                              <SelectItem value="average">Average</SelectItem>
                              <SelectItem value="good">Good</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="english_level">English Level *</Label>
                        <Select
                          value={newStudentData.english_level}
                          onValueChange={(value) => setNewStudentData({ ...newStudentData, english_level: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select english level" />
                          </SelectTrigger>
                          <SelectContent>
                            {batch?.course_type === 'SAT' ? (
                              <>
                                <SelectItem value="bad">Needs Work</SelectItem>
                                <SelectItem value="average">Average</SelectItem>
                                <SelectItem value="good">Good</SelectItem>
                              </>
                            ) : (
                              <>
                                <SelectItem value="B1">B1</SelectItem>
                                <SelectItem value="B2">B2</SelectItem>
                                <SelectItem value="C1">C1</SelectItem>
                                <SelectItem value="C2">C2</SelectItem>
                              </>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowAddStudent(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddStudent}>
                    Add Student
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {batch?.course_type === 'SAT' && (
              <Dialog open={showScoreCalculator} onOpenChange={setShowScoreCalculator}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    SAT Score Calculator
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[1040px] w-full p-6">
                  <DialogHeader>
                    <DialogTitle>SAT Score Calculator</DialogTitle>
                    <DialogDescription>
                      Use this tool to calculate SAT scores from raw scores
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    <iframe 
                      src="https://test-ninjas.com/embed/digital-sat-score-calculator" 
                      width="1000"
                      height="900"
                      frameBorder="0"
                      referrerPolicy="strict-origin-when-cross-origin"
                      title="SAT Score Calculator"
                      className="w-full rounded-md"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-60px)] overflow-hidden">
        {/* Sidebar - Hidden on mobile and small tablets */}
        <div className="hidden lg:block flex-shrink-0">
          <StudentSidebar
            students={students}
            currentIndex={currentIndex}
            onSelectStudent={(index) => {
              setCurrentIndex(index);
              if (emblaApi) emblaApi.scrollTo(index);
            }}
            batch={batch}
            getStudentAlertStatus={getStudentAlertStatus}
            getStudentAttendance={(studentId) => studentDataMap.get(studentId)?.attendance || []}
            getStudentHomework={(studentId) => studentDataMap.get(studentId)?.homework || []}
          />
        </div>

        {/* Student Card Carousel */}
        <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 overflow-hidden">
          <div className="w-full max-w-4xl flex flex-col" style={{ height: 'calc(100% - 80px)' }}>
            <div className="overflow-visible h-full mb-4" ref={emblaRef}>
              <div className="flex h-full">
                {students.map((student, index) => {
                  const studentData = studentDataMap.get(student.id);
                  const alertStatus = getStudentAlertStatus(student.id);
                  const isActive = index === currentIndex;
                  return (
                    <div 
                      key={student.id} 
                      className="flex-[0_0_94%] sm:flex-[0_0_90%] md:flex-[0_0_86%] lg:flex-[0_0_82%] min-w-0 px-1 md:px-2 h-full transition-all duration-300 cursor-pointer group"
                      onClick={() => {
                        if (index !== currentIndex) {
                          emblaApi?.scrollTo(index);
                        }
                      }}
                      style={{
                        transform: isActive ? 'scale(1)' : 'scale(0.92)',
                        opacity: isActive ? 1 : 0.4,
                        filter: isActive ? 'blur(0px)' : 'blur(0.8px)',
                      }}
                    >
                      <Card className={`h-full overflow-y-auto transition-all duration-300 ${alertStatus.hasAlert ? "shadow-lg border-2 border-destructive" : "shadow-lg"} ${!isActive ? 'pointer-events-none group-hover:scale-105' : ''}`}>
                        <StudentCard
                          student={student}
                          currentIndex={index}
                          totalStudents={students.length}
                          attendance={studentData?.attendance || []}
                          homework={studentData?.homework || []}
                          practiceTests={studentData?.practiceTests || []}
                          hasAlert={alertStatus.hasAlert}
                          missedClasses={alertStatus.missedClasses}
                          missedHomework={alertStatus.missedHomework}
                          courseType={batch?.course_type || 'SAT'}
                          batchId={batchId || ''}
                          teacherName={teacherName || ''}
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

            {/* Navigation Buttons - Hidden on tablet/iPad */}
            {!isTablet && (
              <div className="flex justify-center gap-2 md:gap-4 mt-3 md:mt-6 pb-2 md:pb-0 flex-shrink-0">
                <Button
                  variant="outline"
                  size="default"
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="min-w-[120px] md:min-w-[160px]"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  variant="default"
                  size="default"
                  onClick={handleNext}
                  disabled={currentIndex === students.length - 1}
                  className="min-w-[120px] md:min-w-[160px] bg-primary"
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
