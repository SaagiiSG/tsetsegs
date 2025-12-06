import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ChevronLeft, Search, Users, AlertTriangle, User, 
  Phone, School, BookOpen, Filter, ChevronRight, Settings, LogOut
} from "lucide-react";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  school_name?: string;
  grade?: string;
  first_session_completed?: boolean;
  batch_id: string;
  batch_name?: string;
  course_type?: 'SAT' | 'IELTS';
}

interface Batch {
  id: string;
  batch_name: string;
  course_type: 'SAT' | 'IELTS';
}

export default function TeacherAllStudents() {
  const { teacherName, signOut, isLoading: authLoading } = useTeacherAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [students, setStudents] = useState<Student[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && teacherName) {
      fetchData();
    }
  }, [teacherName, authLoading]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch batches for this teacher
      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select("id, batch_name, course_type")
        .ilike("teacher", `%${teacherName}%`)
        .order("start_date", { ascending: false });

      if (batchesError) throw batchesError;
      setBatches(batchesData || []);

      // Fetch all students from teacher's batches
      if (batchesData && batchesData.length > 0) {
        const batchIds = batchesData.map(b => b.id);
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select("id, first_name, last_name, phone, school_name, grade, first_session_completed, batch_id")
          .in("batch_id", batchIds)
          .order("first_name");

        if (studentsError) throw studentsError;

        // Enrich students with batch info
        const batchMap = new Map(batchesData.map(b => [b.id, b]));
        const enrichedStudents = (studentsData || []).map(s => ({
          ...s,
          batch_name: batchMap.get(s.batch_id)?.batch_name,
          course_type: batchMap.get(s.batch_id)?.course_type,
        }));
        setStudents(enrichedStudents);
      }
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/teacher/login");
  };

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = searchQuery === "" || 
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.phone.includes(searchQuery) ||
        student.school_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesBatch = selectedBatch === "all" || student.batch_id === selectedBatch;
      const matchesCourse = selectedCourse === "all" || student.course_type === selectedCourse;

      return matchesSearch && matchesBatch && matchesCourse;
    });
  }, [students, searchQuery, selectedBatch, selectedCourse]);

  // Group by course type for stats
  const stats = useMemo(() => {
    const satCount = students.filter(s => s.course_type === 'SAT').length;
    const ieltsCount = students.filter(s => s.course_type === 'IELTS').length;
    const incompleteIntake = students.filter(s => !s.first_session_completed).length;
    return { total: students.length, satCount, ieltsCount, incompleteIntake };
  }, [students]);

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher/dashboard")}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">All Students</h1>
              <p className="text-muted-foreground text-sm">Manage all your students across classes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/teacher/settings")}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Total Students</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs">SAT</span>
              </div>
              <p className="text-2xl font-bold">{stats.satCount}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                <BookOpen className="h-4 w-4" />
                <span className="text-xs">IELTS</span>
              </div>
              <p className="text-2xl font-bold">{stats.ieltsCount}</p>
            </CardContent>
          </Card>
          <Card className={stats.incompleteIntake > 0 ? 'bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Incomplete Intake</span>
              </div>
              <p className="text-2xl font-bold">{stats.incompleteIntake}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger className="w-full md:w-[140px]">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="SAT">SAT</SelectItem>
                  <SelectItem value="IELTS">IELTS</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Batch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Showing {filteredStudents.length} of {students.length} students
            </p>
          </CardContent>
        </Card>

        {/* Students List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredStudents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {students.length === 0 ? "No students found" : "No students match your filters"}
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/teacher/student/${student.id}`)}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">
                              {student.first_name} {student.last_name}
                            </p>
                            {!student.first_session_completed && (
                              <Badge variant="outline" className="text-xs shrink-0">
                                ⚠️ Incomplete
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {student.phone}
                            </span>
                            {student.school_name && (
                              <span className="flex items-center gap-1 hidden sm:flex">
                                <School className="h-3 w-3" />
                                {student.school_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden md:block">
                          <Badge variant={student.course_type === 'SAT' ? 'default' : 'secondary'}>
                            {student.course_type}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1 truncate max-w-[150px]">
                            {student.batch_name}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
