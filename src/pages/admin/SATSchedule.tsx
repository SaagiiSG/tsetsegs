import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  { value: "march", label: "Mar" },
  { value: "may", label: "May" },
  { value: "june", label: "Jun" },
  { value: "august", label: "Aug" },
  { value: "sep", label: "Sep" },
  { value: "oct", label: "Oct" },
  { value: "nov", label: "Nov" },
  { value: "dec", label: "Dec" },
];

const MONTH_FULL_NAMES: Record<string, string> = {
  march: "March",
  may: "May",
  june: "June",
  august: "August",
  sep: "September",
  oct: "October",
  nov: "November",
  dec: "December",
};

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
          View students by their planned SAT test month
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
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
            <CardContent className="p-2 md:p-3 text-center">
              <p className="text-xs font-medium text-muted-foreground truncate">
                {month.label}
              </p>
              <p className="text-xl md:text-2xl font-bold">
                {loading ? (
                  <Skeleton className="h-7 w-6 mx-auto" />
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
        <TabsList className="flex flex-wrap h-auto gap-1">
          {SAT_MONTHS.map((month) => (
            <TabsTrigger
              key={month.value}
              value={month.value}
              className="relative text-xs md:text-sm"
            >
              {MONTH_FULL_NAMES[month.value]}
              {monthCounts[month.value] > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1 h-5 min-w-5 px-1 text-xs"
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
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  {MONTH_FULL_NAMES[month.value]} SAT Takers
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
                    <p>No students registered for {MONTH_FULL_NAMES[month.value]} SAT</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {getStudentsByMonth(month.value).map((student) => (
                      <div
                        key={student.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors gap-2"
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
    </div>
  );
}