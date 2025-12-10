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
  Phone, School, BookOpen, Filter, ChevronRight, Settings, LogOut, ArrowLeft, GraduationCap
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
    const sat = students.filter(s => s.course_type === 'SAT').length;
    const ielts = students.filter(s => s.course_type === 'IELTS').length;
    const incompleteIntake = students.filter(s => !s.first_session_completed).length;
    return { total: students.length, sat, ielts, incompleteIntake };
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
      <div className="container mx-auto p-3 md:p-6 lg:p-8 max-w-6xl">
        {/* Compact Header */}
        <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9 flex-shrink-0" onClick={() => navigate("/teacher/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl lg:text-3xl font-bold truncate">All Students</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Manage students across classes</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" onClick={() => navigate("/teacher/settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 md:h-9 px-2 md:px-3" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards - Horizontal scroll on mobile */}
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 -mx-3 px-3 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible mb-4 md:mb-6">
          <Card className="p-2.5 md:p-3 flex-shrink-0 w-[100px] md:w-auto">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Total</p>
                <p className="text-lg md:text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5 md:p-3 flex-shrink-0 w-[100px] md:w-auto bg-blue-500/5 border-blue-500/20">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400">SAT</p>
                <p className="text-lg md:text-xl font-bold">{stats.sat}</p>
              </div>
            </div>
          </Card>
          <Card className="p-2.5 md:p-3 flex-shrink-0 w-[100px] md:w-auto bg-purple-500/5 border-purple-500/20">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-[10px] md:text-xs text-purple-600 dark:text-purple-400">IELTS</p>
                <p className="text-lg md:text-xl font-bold">{stats.ielts}</p>
              </div>
            </div>
          </Card>
          <Card className={`p-2.5 md:p-3 flex-shrink-0 w-[100px] md:w-auto ${stats.incompleteIntake > 0 ? 'bg-amber-500/5 border-amber-500/20' : ''}`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-[10px] md:text-xs text-amber-600 dark:text-amber-400">Incomplete</p>
                <p className="text-lg md:text-xl font-bold">{stats.incompleteIntake}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Compact Filters */}
        <div className="space-y-2 md:space-y-0 md:flex md:gap-2 p-2 md:p-3 bg-card rounded-lg border mb-3 md:mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 md:h-9 text-xs md:text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-[80px] md:w-[100px] h-8 md:h-9 text-xs md:text-sm">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs md:text-sm">All</SelectItem>
                <SelectItem value="SAT" className="text-xs md:text-sm">SAT</SelectItem>
                <SelectItem value="IELTS" className="text-xs md:text-sm">IELTS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedBatch} onValueChange={setSelectedBatch}>
              <SelectTrigger className="flex-1 md:w-[160px] h-8 md:h-9 text-xs md:text-sm">
                <SelectValue placeholder="Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs md:text-sm">All Batches</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id} className="text-xs md:text-sm">
                    {batch.batch_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Compact Students List */}
        <Card className="overflow-hidden">
          <div className="p-2 md:p-3 border-b flex items-center justify-between">
            <span className="text-xs md:text-sm font-medium">{filteredStudents.length} students</span>
          </div>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground text-xs md:text-sm">
              {students.length === 0 ? "No students found" : "No students match your filters"}
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-320px)] md:h-[calc(100vh-380px)]">
              <div className="divide-y">
                {filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-2.5 md:p-3 hover:bg-muted/50 active:bg-muted/70 cursor-pointer transition-colors"
                    onClick={() => navigate(`/teacher/student/${student.id}`)}
                  >
                    <div className="flex items-center gap-2.5 md:gap-3 min-w-0 flex-1">
                      <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs md:text-sm font-medium text-primary">
                          {student.first_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-sm md:text-base truncate">
                            {student.first_name} {student.last_name}
                          </p>
                          {!student.first_session_completed && (
                            <span className="text-[10px] text-amber-600">⚠️</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] md:text-xs text-muted-foreground">
                          <Phone className="h-2.5 w-2.5" />
                          <span>{student.phone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] md:text-xs px-1.5 ${student.course_type === 'SAT' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' : 'bg-purple-500/10 text-purple-600 border-purple-500/30'}`}
                      >
                        {student.course_type}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </Card>
      </div>
    </div>
  );
}
