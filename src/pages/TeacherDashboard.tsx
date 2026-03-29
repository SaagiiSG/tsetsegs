import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LogOut, Users, Calendar, MapPin, AlertTriangle, Settings, GraduationCap, BarChart3, Search, QrCode, ArrowRightLeft, LayoutDashboard, Flame, X, Flower2 } from "lucide-react";
import QRCodeComponent from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IntensePrepContent } from "@/components/teacher/intense-prep";
import { useToast } from "@/hooks/use-toast";
import { StudentAlertsTab } from "@/components/teacher/StudentAlertsTab";
import { StudentSearchCommand } from "@/components/teacher/StudentSearchCommand";
import { ReviewRegistrationContent } from "@/components/teacher/ReviewRegistrationContent";
import { getErrorToast } from "@/lib/errorUtils";

interface Batch {
  id: string;
  batch_name: string;
  schedule: string;
  room: string;
  start_date: string;
  course_type?: string;
}

interface SwitchedStudentInfo {
  studentId: string;
  studentName: string;
  otherBatchName: string;
}

type DashboardMode = "dashboard" | "review" | "intense";

const MODE_ORDER: DashboardMode[] = ["dashboard", "review", "intense"];

export default function TeacherDashboard() {
  const { teacherName, signOut, isLoading: authLoading } = useTeacherAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [switchedStudents, setSwitchedStudents] = useState<Record<string, SwitchedStudentInfo[]>>({});
  const [selectedIntake, setSelectedIntake] = useState<string>("current");
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("classes");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<DashboardMode>("dashboard");
  const [slideDirection, setSlideDirection] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle mode change with direction tracking
  const handleModeChange = (newMode: DashboardMode) => {
    const currentIndex = MODE_ORDER.indexOf(activeMode);
    const newIndex = MODE_ORDER.indexOf(newMode);
    setSlideDirection(newIndex > currentIndex ? 1 : -1);
    setActiveMode(newMode);
  };

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

      const { data: batchesData, error: batchesError } = await supabase
        .from("batches")
        .select("id, batch_name, schedule, room, start_date, course_type")
        .ilike("teacher", `%${teacherName}%`)
        .order("start_date", { ascending: false });

      if (batchesError) throw batchesError;

      const { data: completionData, error: completionError } = await supabase.rpc(
        "get_batch_completion_status",
        { teacher_name: teacherName }
      );

      if (completionError) {
        console.error("Error fetching completion status:", completionError);
      }

      const completionMap: Record<string, boolean> = {};
      completionData?.forEach((item: { batch_id: string; is_completed: boolean }) => {
        completionMap[item.batch_id] = item.is_completed;
      });

      let filteredBatches = batchesData || [];
      if (selectedIntake === "current") {
        filteredBatches = filteredBatches.filter(b => !completionMap[b.id]);
      } else if (selectedIntake === "previous") {
        filteredBatches = filteredBatches.filter(b => completionMap[b.id]);
      }

      setBatches(filteredBatches);

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

      if (filteredBatches.length > 0) {
        await fetchSwitchedStudents(filteredBatches);
      }
    } catch (error: any) {
      console.error("Error fetching batches:", error);
      const errorToast = getErrorToast(error, "load classes");
      toast({
        ...errorToast,
        variant: "destructive",
      });
    } finally {
      console.log("Setting isLoading to false");
      setIsLoading(false);
    }
  };

  const fetchSwitchedStudents = async (batchList: Batch[]) => {
    try {
      const batchIds = batchList.map(b => b.id);
      
      const { data: students, error: studentsError } = await supabase
        .from("students")
        .select("id, name, phone, batch_id")
        .in("batch_id", batchIds);

      if (studentsError) throw studentsError;
      if (!students || students.length === 0) return;

      const phoneNumbers = [...new Set(students.map(s => s.phone))];

      const { data: allMatchingStudents, error: matchError } = await supabase
        .from("students")
        .select(`
          id,
          name,
          phone,
          batch_id,
          batches(batch_name)
        `)
        .in("phone", phoneNumbers)
        .not("batch_id", "in", `(${batchIds.join(",")})`);

      if (matchError) throw matchError;
      if (!allMatchingStudents || allMatchingStudents.length === 0) {
        setSwitchedStudents({});
        return;
      }

      const allStudentIds = [
        ...students.map(s => s.id),
        ...allMatchingStudents.map(s => s.id)
      ];

      const { data: attendanceData, error: attError } = await supabase
        .from("attendance")
        .select("student_id, total_attended")
        .in("student_id", allStudentIds);

      if (attError) throw attError;

      const attendanceLookup: Record<string, number> = {};
      attendanceData?.forEach(a => {
        attendanceLookup[a.student_id] = a.total_attended || 0;
      });

      const switched: Record<string, SwitchedStudentInfo[]> = {};

      students.forEach(currentStudent => {
        const normalizedName = currentStudent.name.toLowerCase().trim();
        const normalizedPhone = currentStudent.phone.trim();
        
        const matches = allMatchingStudents.filter(other => {
          const otherName = other.name.toLowerCase().trim();
          const otherPhone = other.phone.trim();
          return otherName === normalizedName && otherPhone === normalizedPhone && other.batch_id;
        });

        if (matches.length > 0) {
          let bestMatch = matches[0];
          let bestAttendance = attendanceLookup[bestMatch.id] || 0;

          matches.forEach(match => {
            const matchAtt = attendanceLookup[match.id] || 0;
            if (matchAtt > bestAttendance) {
              bestMatch = match;
              bestAttendance = matchAtt;
            }
          });

          const currentAttendance = attendanceLookup[currentStudent.id] || 0;

          if (currentAttendance < bestAttendance && currentStudent.batch_id) {
            const batchInfo = bestMatch.batches as { batch_name: string } | null;
            
            if (!switched[currentStudent.batch_id]) {
              switched[currentStudent.batch_id] = [];
            }
            
            switched[currentStudent.batch_id].push({
              studentId: currentStudent.id,
              studentName: currentStudent.name,
              otherBatchName: batchInfo?.batch_name || 'Another class',
            });
          }
        }
      });

      setSwitchedStudents(switched);
    } catch (error) {
      console.error("Error fetching switched students:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login?role=teacher");
  };

  const getStudentCount = (batchId: string) => {
    return studentCounts[batchId] || 0;
  };

  const getSwitchedCount = (batchId: string) => {
    return switchedStudents[batchId]?.length || 0;
  };

  const isOnlineClass = (schedule: string) => {
    return schedule.toLowerCase().includes("online");
  };

  const intakes = useMemo(() => {
    return [
      { label: "Active Classes", value: "current" },
      { label: "Completed Classes", value: "previous" },
      { label: "All Classes", value: "all" },
    ];
  }, []);

  const groupedBatches = useMemo(() => {
    if (selectedIntake !== "all") {
      return { ungrouped: batches };
    }
    
    const groups: Record<string, typeof batches> = {};
    batches.forEach(batch => {
      const date = new Date(batch.start_date);
      const key = `${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(batch);
    });
    return groups;
  }, [batches, selectedIntake]);

  // Slide animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0
    })
  };

  const slideTransition = {
    type: "spring" as const,
    stiffness: 200,
    damping: 27,
    mass: 1.2
  };

  const [qrBatch, setQrBatch] = useState<Batch | null>(null);

  // Batch card component with animation
  const BatchCard = ({ batch, index = 0 }: { batch: Batch; index?: number }) => {
    const switchedCount = getSwitchedCount(batch.id);
    const switchedList = switchedStudents[batch.id] || [];
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
      >
        <Card className="p-3 md:p-4 hover:shadow-md transition-shadow">
          <div className="space-y-2 md:space-y-3">
            <div>
              <h3 className="font-semibold text-sm md:text-base leading-tight line-clamp-2">{batch.batch_name}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3 w-3" />
                  <span>{getStudentCount(batch.id)} students</span>
                </div>
                {switchedCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 text-warning cursor-help">
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>{switchedCount} switched</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[280px]">
                      <div className="space-y-1">
                        <p className="font-semibold text-warning">Students enrolled in another class</p>
                        <ul className="text-xs space-y-0.5">
                          {switchedList.slice(0, 5).map((s, i) => (
                            <li key={i} className="text-muted-foreground">
                              • {s.studentName} → {s.otherBatchName}
                            </li>
                          ))}
                          {switchedList.length > 5 && (
                            <li className="text-muted-foreground">
                              ...and {switchedList.length - 5} more
                            </li>
                          )}
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>
            
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
            
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 h-8 md:h-9 text-xs md:text-sm" onClick={() => navigate(`/teacher/students/${batch.id}`)}>
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Students
              </Button>
              <Button variant="outline" className="h-8 md:h-9 w-8 md:w-9 p-0" onClick={() => setQrBatch(batch)}>
                <QrCode className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" className="h-8 md:h-9 w-8 md:w-9 p-0" onClick={() => navigate(`/teacher/analytics/${batch.id}`)}>
                <BarChart3 className="h-3.5 w-3.5" />
              </Button>
              {selectedIntake === "previous" && (
                <Button variant="outline" className="h-8 md:h-9 w-8 md:w-9 p-0" onClick={() => navigate(`/teacher/wrapped/${batch.id}`)}>
                  <Flower2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  // Dashboard content (existing tabs)
  const DashboardContent = () => (
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
                {batches.length} class{batches.length !== 1 ? "es" : ""}
              </span>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedIntake}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {selectedIntake === "all" ? (
                  <div className="space-y-4">
                    {Object.entries(groupedBatches).map(([monthYear, monthBatches], groupIndex) => (
                      monthYear !== "ungrouped" && (
                        <motion.div 
                          key={monthYear} 
                          className="space-y-2"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: groupIndex * 0.1 }}
                        >
                          <h4 className="text-xs md:text-sm font-medium text-muted-foreground px-1 sticky top-0 bg-background/80 backdrop-blur-sm py-1">
                            {monthYear}
                          </h4>
                          <div className="grid gap-2.5 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {monthBatches.map((batch, index) => (
                              <BatchCard key={batch.id} batch={batch} index={index} />
                            ))}
                          </div>
                        </motion.div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-2.5 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {batches.map((batch, index) => (
                      <BatchCard key={batch.id} batch={batch} index={index} />
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
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
  );


  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="container mx-auto p-3 md:p-6 lg:p-8 pb-24">
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

          <StudentSearchCommand open={searchOpen} onOpenChange={setSearchOpen} />

          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={slideDirection}>
              {activeMode === "dashboard" && (
                <motion.div
                  key="dashboard"
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                >
                  <DashboardContent />
                </motion.div>
              )}
              {activeMode === "review" && (
                <motion.div
                  key="review"
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                >
                  <ReviewRegistrationContent />
                </motion.div>
              )}
              {activeMode === "intense" && (
                <motion.div
                  key="intense"
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                >
                  <IntensePrepContent />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mode navigation toolbar at bottom center */}
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 bg-card/95 backdrop-blur-sm border shadow-lg rounded-full p-1"
          >
            <Button
              variant={activeMode === "dashboard" ? "default" : "ghost"}
              size="sm"
              className="h-9 rounded-full gap-2 text-xs px-3"
              onClick={() => handleModeChange("dashboard")}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Button>
            <Button
              variant={activeMode === "review" ? "default" : "ghost"}
              size="sm"
              className="h-9 rounded-full gap-2 text-xs px-3"
              onClick={() => handleModeChange("review")}
            >
              <QrCode className="h-4 w-4" />
              <span className="hidden sm:inline">Review</span>
            </Button>
            <Button
              variant={activeMode === "intense" ? "default" : "ghost"}
              size="sm"
              className="h-9 rounded-full gap-2 text-xs px-3"
              onClick={() => handleModeChange("intense")}
            >
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">Intense</span>
            </Button>
          </motion.div>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!qrBatch} onOpenChange={(open) => !open && setQrBatch(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-sm">Student Onboarding QR</DialogTitle>
            <p className="text-xs text-muted-foreground text-center">{qrBatch?.batch_name}</p>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeComponent
                value={`https://tsetsegs.lovable.app/register?batch=${qrBatch?.id}`}
                size={220}
                level="H"
              />
            </div>
            <p className="text-[10px] text-muted-foreground text-center max-w-[250px]">
              Students scan this QR to register and get auto-assigned to this class
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
