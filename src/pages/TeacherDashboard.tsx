import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Users, Calendar, MapPin, AlertTriangle, Settings, GraduationCap, BarChart3, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StudentAlertsTab } from "@/components/teacher/StudentAlertsTab";
import { StudentSearchCommand } from "@/components/teacher/StudentSearchCommand";

interface Batch {
  id: string;
  batch_name: string;
  schedule: string;
  room: string;
  start_date: string;
  course_type?: string;
}

export default function TeacherDashboard() {
  const { teacherName, signOut, isLoading: authLoading } = useTeacherAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [selectedIntake, setSelectedIntake] = useState<string>("current");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("classes");
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    console.log("TeacherDashboard - authLoading:", authLoading, "teacherName:", teacherName);
    if (!authLoading) {
      console.log("Fetching batches...");
      fetchBatches();
    }
  }, [teacherName, authLoading, selectedIntake]);

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
        .select("id, batch_name, schedule, room, start_date, course_type")
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
      <div className="container mx-auto p-3 md:p-6 lg:p-8">
        {/* Compact header on mobile */}
        <div className="flex items-center justify-between gap-2 mb-4 md:mb-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-2xl lg:text-3xl font-bold truncate">Welcome, {teacherName}!</h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 hidden sm:block">Manage your classes and track attendance</p>
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 md:h-9 px-2 md:px-3 text-muted-foreground"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline text-xs">Search</span>
              <kbd className="hidden lg:inline-flex ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 md:h-9 md:w-9" onClick={() => navigate("/teacher/settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 md:h-9 px-2 md:px-3" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        </div>

        {/* Global Search Command */}
        <StudentSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 md:space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-9 md:h-10">
            <TabsTrigger value="classes" className="text-xs md:text-sm px-2">
              Classes
            </TabsTrigger>
            <TabsTrigger value="students" className="text-xs md:text-sm px-2">
              <GraduationCap className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
              <span className="hidden xs:inline">Students</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs md:text-sm px-2">
              <AlertTriangle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1" />
              <span className="hidden xs:inline">Alerts</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-3 md:space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-6 md:py-12">
                <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-primary"></div>
              </div>
            ) : batches.length === 0 ? (
              <Card>
                <CardContent className="py-6 md:py-12 text-center text-muted-foreground text-xs md:text-sm">
                  No classes assigned yet
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3 md:space-y-4">
                {/* Compact inline filter */}
                <div className="flex items-center gap-2 p-2 md:p-3 bg-card rounded-lg border">
                  <Select
                    value={selectedIntake}
                    onValueChange={setSelectedIntake}
                  >
                    <SelectTrigger className="h-8 md:h-9 text-xs md:text-sm flex-1">
                      <SelectValue placeholder="Select intake" />
                    </SelectTrigger>
                    <SelectContent>
                      {intakes.map((intake) => (
                        <SelectItem key={intake.value} value={intake.value} className="text-xs md:text-sm">
                          {intake.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-[10px] md:text-xs text-muted-foreground whitespace-nowrap">
                    {filteredBatches.length} class{filteredBatches.length !== 1 ? "es" : ""}
                  </span>
                </div>

                {/* Compact Batch Cards */}
                <div className="grid gap-2.5 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredBatches.map((batch) => (
                    <Card key={batch.id} className="p-3 md:p-4 hover:shadow-md transition-shadow">
                      <div className="space-y-2 md:space-y-3">
                        {/* Header */}
                        <div>
                          <h3 className="font-semibold text-sm md:text-base leading-tight line-clamp-2">{batch.batch_name}</h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <Users className="h-3 w-3" />
                            <span>{getStudentCount(batch.id)} students</span>
                          </div>
                        </div>
                        
                        {/* Details - More compact */}
                        <div className="space-y-1.5 text-xs md:text-sm">
                          <div className="flex items-start gap-1.5 text-muted-foreground">
                            <Calendar className="h-3 w-3 md:h-3.5 md:w-3.5 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2 leading-tight">{batch.schedule}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                            <span>
                              {isOnlineClass(batch.schedule) ? "🌐 Online" : `Room ${batch.room}`}
                            </span>
                            <span className="text-muted-foreground/50">•</span>
                            <span>
                              {new Date(batch.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                        
                        {/* Action buttons - Compact */}
                        <div className="flex gap-2 pt-1">
                          <Button className="flex-1 h-8 md:h-9 text-xs md:text-sm" onClick={() => navigate(`/teacher/students/${batch.id}`)}>
                            <Users className="h-3.5 w-3.5 mr-1.5" />
                            Students
                          </Button>
                          <Button variant="outline" className="h-8 md:h-9 w-8 md:w-9 p-0" onClick={() => navigate(`/teacher/analytics/${batch.id}`)}>
                            <BarChart3 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="students">
            <Card className="p-4 md:p-6">
              <div className="text-center space-y-3">
                <GraduationCap className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-sm md:text-base font-semibold">All Students</h3>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1">View and manage students</p>
                </div>
                <Button className="h-8 md:h-9 text-xs md:text-sm" onClick={() => navigate("/teacher/students")}>
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Open Directory
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="alerts">
            <Card className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <h3 className="text-sm md:text-base font-semibold">Needs Attention</h3>
              </div>
              {teacherName ? (
                <StudentAlertsTab teacherName={teacherName} />
              ) : (
                <p className="text-muted-foreground text-center py-4 text-xs">Loading...</p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
