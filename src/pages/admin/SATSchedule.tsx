import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Users, Phone, GraduationCap } from "lucide-react";

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
}

const SAT_MONTHS = [
  { value: "march", label: "March" },
  { value: "may", label: "May" },
  { value: "june", label: "June" },
  { value: "august", label: "August" },
  { value: "sep", label: "September" },
  { value: "oct", label: "October" },
  { value: "nov", label: "November" },
  { value: "dec", label: "December" },
];

export default function SATSchedule() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMonth, setActiveMonth] = useState("march");

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

  const getStudentsByMonth = (month: string) => {
    return students.filter((s) => s.sat_test_month === month);
  };

  const getMonthCounts = () => {
    const counts: Record<string, number> = {};
    SAT_MONTHS.forEach((m) => {
      counts[m.value] = students.filter((s) => s.sat_test_month === m.value).length;
    });
    return counts;
  };

  const monthCounts = getMonthCounts();

  const getLevelBadge = (level: string | null) => {
    if (!level) return null;
    const colors: Record<string, string> = {
      bad: "bg-red-100 text-red-800",
      average: "bg-yellow-100 text-yellow-800",
      good: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      bad: "Weak",
      average: "Average",
      good: "Strong",
    };
    return (
      <Badge variant="outline" className={colors[level]}>
        {labels[level] || level}
      </Badge>
    );
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center gap-4 mb-6">
            <SidebarTrigger />
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <CalendarDays className="h-6 w-6" />
                SAT Schedule
              </h1>
              <p className="text-muted-foreground">
                View students by their planned SAT test month
              </p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {SAT_MONTHS.map((month) => (
              <Card
                key={month.value}
                className={`cursor-pointer transition-all ${
                  activeMonth === month.value
                    ? "ring-2 ring-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => setActiveMonth(month.value)}
              >
                <CardContent className="p-3 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    {month.label}
                  </p>
                  <p className="text-2xl font-bold">
                    {loading ? (
                      <Skeleton className="h-8 w-8 mx-auto" />
                    ) : (
                      monthCounts[month.value]
                    )}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs for each month */}
          <Tabs value={activeMonth} onValueChange={setActiveMonth}>
            <TabsList className="flex-wrap h-auto gap-1">
              {SAT_MONTHS.map((month) => (
                <TabsTrigger
                  key={month.value}
                  value={month.value}
                  className="relative"
                >
                  {month.label}
                  {monthCounts[month.value] > 0 && (
                    <Badge
                      variant="secondary"
                      className="ml-1.5 h-5 min-w-5 px-1.5 text-xs"
                    >
                      {monthCounts[month.value]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            {SAT_MONTHS.map((month) => (
              <TabsContent key={month.value} value={month.value}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {month.label} SAT Takers
                      <Badge variant="outline" className="ml-2">
                        {getStudentsByMonth(month.value).length} students
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
                    ) : getStudentsByMonth(month.value).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No students registered for {month.label} SAT</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {getStudentsByMonth(month.value).map((student) => (
                          <div
                            key={student.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <p className="font-medium">
                                {student.first_name} {student.last_name}
                              </p>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {student.phone}
                                </span>
                                {student.review_teacher && (
                                  <span>Teacher: {student.review_teacher}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {student.math_level && (
                                <div className="text-xs text-muted-foreground">
                                  Math: {getLevelBadge(student.math_level)}
                                </div>
                              )}
                              {student.english_level && (
                                <div className="text-xs text-muted-foreground">
                                  Eng: {getLevelBadge(student.english_level)}
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
        </main>
      </div>
    </SidebarProvider>
  );
}
