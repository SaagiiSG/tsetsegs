import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CalendarDays, Users, Phone, GraduationCap, User, Award } from "lucide-react";
import { format } from "date-fns";

interface Student {
  id: string;
  name: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  parent_phone: string | null;
  review_teacher: string | null;
  sat_test_month: string | null;
  created_at: string;
  math_level: string | null;
  english_level: string | null;
  has_taken_sat: boolean | null;
  previous_sat_score: number | null;
  school_name: string | null;
  grade: string | null;
}

// Generate year-month options dynamically
const generateYearMonthOptions = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  const satMonths = [
    { month: 3, label: "March" },
    { month: 5, label: "May" },
    { month: 6, label: "June" },
    { month: 8, label: "August" },
    { month: 9, label: "September" },
    { month: 10, label: "October" },
    { month: 11, label: "November" },
    { month: 12, label: "December" },
  ];
  
  const options: { value: string; label: string; shortLabel: string }[] = [];
  
  // Add dates for current year and next year
  [currentYear, currentYear + 1].forEach(year => {
    satMonths.forEach(({ month, label }) => {
      options.push({
        value: `${year}-${String(month).padStart(2, '0')}`,
        label: `${label} ${year}`,
        shortLabel: `${label.slice(0, 3)} ${String(year).slice(-2)}`,
      });
    });
  });
  
  return options;
};

const SAT_OPTIONS = generateYearMonthOptions();

export default function SATSchedule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(SAT_OPTIONS[0]?.value || "");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .not("sat_test_month", "is", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching students:", error);
    } else {
      setStudents(data || []);
    }
    setLoading(false);
  };

  // Parse sat_test_month to match year-month format
  const parseStudentMonth = (satMonth: string | null): string | null => {
    if (!satMonth) return null;
    
    // If already in YYYY-MM format, return as-is
    if (/^\d{4}-\d{2}$/.test(satMonth)) {
      return satMonth;
    }
    
    // Legacy format: convert month name to current year's date
    const monthMap: Record<string, string> = {
      march: "03", may: "05", june: "06", august: "08",
      sep: "09", oct: "10", nov: "11", dec: "12",
    };
    
    const monthNum = monthMap[satMonth.toLowerCase()];
    if (monthNum) {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${monthNum}`;
    }
    
    return null;
  };

  const getStudentsByTab = (tabValue: string) => {
    return students.filter((s) => parseStudentMonth(s.sat_test_month) === tabValue);
  };

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    SAT_OPTIONS.forEach((opt) => {
      counts[opt.value] = students.filter(
        (s) => parseStudentMonth(s.sat_test_month) === opt.value
      ).length;
    });
    return counts;
  }, [students]);

  // Filter tabs to only show those with students or future dates
  const visibleTabs = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    return SAT_OPTIONS.filter(opt => {
      // Show if has students or is in the future
      return tabCounts[opt.value] > 0 || opt.value >= currentYearMonth;
    });
  }, [tabCounts]);

  const getLevelBadge = (level: string | null) => {
    if (!level) return null;
    const colors: Record<string, string> = {
      bad: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      average: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
      good: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    };
    const labels: Record<string, string> = {
      bad: "Weak",
      average: "Avg",
      good: "Strong",
    };
    return (
      <Badge variant="outline" className={colors[level]}>
        {labels[level] || level}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          SAT Schedule
        </h1>
        <p className="text-muted-foreground">
          View students by their planned SAT test date
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {visibleTabs.slice(0, 8).map((opt) => (
          <Card
            key={opt.value}
            className={`cursor-pointer transition-all ${
              activeTab === opt.value
                ? "ring-2 ring-primary bg-primary/5"
                : "hover:bg-muted/50"
            }`}
            onClick={() => setActiveTab(opt.value)}
          >
            <CardContent className="p-2 md:p-3 text-center">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {opt.shortLabel}
              </p>
              <p className="text-xl md:text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-7 w-6 mx-auto" />
                ) : (
                  tabCounts[opt.value]
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1">
          {visibleTabs.map((opt) => (
            <TabsTrigger
              key={opt.value}
              value={opt.value}
              className="relative text-xs md:text-sm"
            >
              {opt.label}
              {tabCounts[opt.value] > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 px-1 text-xs"
                >
                  {tabCounts[opt.value]}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map((opt) => (
          <TabsContent key={opt.value} value={opt.value}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  {opt.label} SAT Takers
                  <Badge variant="outline" className="ml-2">
                    {getStudentsByTab(opt.value).length} students
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : getStudentsByTab(opt.value).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No students registered for {opt.label} SAT</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getStudentsByTab(opt.value).map((student) => (
                      <div
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-2 cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {student.first_name} {student.last_name}
                          </p>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {student.phone}
                            </span>
                            {student.review_teacher && (
                              <span className="truncate">Teacher: {student.review_teacher}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {student.has_taken_sat && student.previous_sat_score && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {student.previous_sat_score}
                            </Badge>
                          )}
                          {student.math_level && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">M:</span>
                              {getLevelBadge(student.math_level)}
                            </div>
                          )}
                          {student.english_level && (
                            <div className="flex items-center gap-1 text-xs">
                              <span className="text-muted-foreground">E:</span>
                              {getLevelBadge(student.english_level)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Student Profile Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Student Profile
            </DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              {/* Name & Basic Info */}
              <div className="text-center pb-4 border-b">
                <h3 className="text-xl font-semibold">
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </h3>
                {selectedStudent.school_name && (
                  <p className="text-muted-foreground">{selectedStudent.school_name}</p>
                )}
                {selectedStudent.grade && (
                  <Badge variant="outline" className="mt-2">Grade {selectedStudent.grade}</Badge>
                )}
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedStudent.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Parent Phone</p>
                  <p className="font-medium">{selectedStudent.parent_phone || "—"}</p>
                </div>
              </div>

              {/* Teacher */}
              <div className="text-sm">
                <p className="text-muted-foreground">Teacher</p>
                <p className="font-medium">{selectedStudent.review_teacher || "Not assigned"}</p>
              </div>

              {/* SAT Info */}
              <div className="grid grid-cols-2 gap-4 text-sm border-t pt-4">
                <div>
                  <p className="text-muted-foreground">Planned SAT</p>
                  <p className="font-medium">
                    {selectedStudent.sat_test_month
                      ? SAT_OPTIONS.find(o => o.value === parseStudentMonth(selectedStudent.sat_test_month))?.label ||
                        selectedStudent.sat_test_month
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Previous Score</p>
                  <p className="font-medium">
                    {selectedStudent.has_taken_sat && selectedStudent.previous_sat_score
                      ? selectedStudent.previous_sat_score
                      : selectedStudent.has_taken_sat
                        ? "Taken (no score)"
                        : "First time"}
                  </p>
                </div>
              </div>

              {/* Skill Levels */}
              <div className="border-t pt-4">
                <p className="text-muted-foreground text-sm mb-2">Skill Levels</p>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Math:</span>
                    {getLevelBadge(selectedStudent.math_level)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">English:</span>
                    {getLevelBadge(selectedStudent.english_level)}
                  </div>
                </div>
              </div>

              {/* Registration Date */}
              <div className="text-xs text-muted-foreground text-center border-t pt-4">
                Registered {format(new Date(selectedStudent.created_at), "MMM d, yyyy 'at' h:mm a")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
