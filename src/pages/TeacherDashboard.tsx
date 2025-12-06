import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, Calendar, MapPin, AlertTriangle, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudentAlertsTab } from "@/components/teacher/StudentAlertsTab";

interface Batch {
  id: string;
  batch_name: string;
  schedule: string;
  room: string;
  start_date: string;
}

export default function TeacherDashboard() {
  const { teacherName, signOut, isLoading: authLoading } = useTeacherAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [selectedIntake, setSelectedIntake] = useState<string>("current");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("classes");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log("TeacherDashboard - authLoading:", authLoading, "teacherName:", teacherName);
    if (!authLoading) {
      console.log("Fetching batches...");
      fetchBatches();
    }
  }, [teacherName, authLoading]);

  const fetchBatches = async () => {
    console.log("fetchBatches called, teacherName:", teacherName);
    if (!teacherName) {
      console.log("No teacher name, setting loading to false");
      setIsLoading(false);
      return;
    }

    try {
      console.log("Querying batches for teacher:", teacherName);

      // Get date ranges for smart filtering
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Build query with date filtering
      let query = supabase
        .from("batches")
        .select("id, batch_name, schedule, room, start_date")
        .ilike("teacher", `%${teacherName}%`);

      if (selectedIntake === "current") {
        query = query.gte("start_date", currentMonthStart.toISOString());
      } else if (selectedIntake === "previous") {
        query = query
          .gte("start_date", previousMonthStart.toISOString())
          .lt("start_date", currentMonthStart.toISOString());
      }
      // 'all' means no date filter

      const { data: batchesData, error: batchesError } = await query.order("start_date", { ascending: false });

      console.log("Batches query result:", { batchesData, batchesError });
      if (batchesError) throw batchesError;

      setBatches(batchesData || []);

      // Fetch student counts using RPC function (single query)
      const { data: countsData, error: countsError } = await supabase.rpc("get_batch_student_counts", {
        teacher_name: teacherName,
      });

      if (countsError) {
        console.error("Error fetching student counts:", countsError);
      } else {
        const counts: Record<string, number> = {};
        countsData?.forEach((item: { batch_id: string; student_count: number }) => {
          counts[item.batch_id] = item.student_count;
        });
        setStudentCounts(counts);
      }
    } catch (error: any) {
      console.error("Error fetching batches:", error);
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive",
      });
    } finally {
      console.log("Setting isLoading to false");
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/teacher/login");
  };

  const getStudentCount = (batchId: string) => {
    return studentCounts[batchId] || 0;
  };

  const isOnlineClass = (schedule: string) => {
    return schedule.toLowerCase().includes("online");
  };

  // Intake filter options
  const intakes = useMemo(() => {
    return [
      { label: "Current Month", value: "current" },
      { label: "Previous Month", value: "previous" },
      { label: "All Intakes", value: "all" },
    ];
  }, []);

  // Filtering is now done server-side in fetchBatches
  const filteredBatches = useMemo(() => batches, [batches]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold truncate">Welcome, {teacherName}! 👋</h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Manage your classes and track attendance</p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/teacher/settings")}
              className="shrink-0"
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="flex-1 sm:flex-none">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="classes" className="text-sm md:text-base">
              My Classes
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-sm md:text-base">
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              <span className="hidden xs:inline">Alerts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-4 md:space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-8 md:py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : batches.length === 0 ? (
              <Card>
                <CardContent className="py-8 md:py-12 text-center text-muted-foreground text-sm md:text-base">
                  No classes assigned yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 md:space-y-6">
                {/* Filter */}
                <Card>
                  <CardHeader className="pb-3 md:pb-6">
                    <CardTitle className="text-base md:text-lg">Filter Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={selectedIntake}
                      onValueChange={(value) => {
                        setSelectedIntake(value);
                        setIsLoading(true);
                        setTimeout(() => fetchBatches(), 0);
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select intake" />
                      </SelectTrigger>
                      <SelectContent>
                        {intakes.map((intake) => (
                          <SelectItem key={intake.value} value={intake.value}>
                            {intake.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs md:text-sm text-muted-foreground mt-2">
                      Showing {filteredBatches.length} of {batches.length} class{batches.length !== 1 ? "es" : ""}
                    </p>
                  </CardContent>
                </Card>

                {/* Batch Cards */}
                <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBatches.map((batch) => (
                    <Card key={batch.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3 md:pb-6">
                        <CardTitle className="text-base md:text-lg leading-tight">{batch.batch_name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 text-xs md:text-sm">
                          <Users className="h-3 w-3 md:h-4 md:w-4 shrink-0" />
                          {getStudentCount(batch.id)} students
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2.5 md:space-y-3">
                        <div className="flex items-start gap-2 text-xs md:text-sm">
                          <Calendar className="h-3 w-3 md:h-4 md:w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">Schedule:</p>
                            <p className="text-muted-foreground whitespace-pre-line break-words">{batch.schedule}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs md:text-sm">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground shrink-0" />
                          <span className="truncate">
                            {isOnlineClass(batch.schedule) ? (
                              <span className="font-medium text-primary">🌐 Online Class</span>
                            ) : (
                              <>Room {batch.room}</>
                            )}
                          </span>
                        </div>
                        <div className="text-xs md:text-sm">
                          <p className="font-medium">Start Date:</p>
                          <p className="text-muted-foreground">
                            {new Date(batch.start_date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <Button
                          className="w-full mt-3 md:mt-4 text-sm md:text-base h-9 md:h-10"
                          onClick={() => navigate(`/teacher/students/${batch.id}`)}
                        >
                          <span className="hidden sm:inline">View Students & Attendance</span>
                          <span className="inline sm:hidden">View Students</span>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="alerts">
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-destructive shrink-0" />
                  <span>Students Needing Attention</span>
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Students with 3+ missed classes or homework across all your batches
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teacherName ? (
                  <StudentAlertsTab teacherName={teacherName} />
                ) : (
                  <p className="text-muted-foreground text-center py-6 md:py-8 text-sm md:text-base">Loading...</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
