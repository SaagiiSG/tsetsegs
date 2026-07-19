import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTeacherAuth } from "@/contexts/TeacherAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { LogOut, Settings, Search, QrCode, LayoutDashboard, TrendingUp, Gamepad2, ClipboardList, BookOpen } from "lucide-react";
import QRCodeComponent from "react-qr-code";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StudentSearchCommand } from "@/components/teacher/StudentSearchCommand";
import { TeacherPracticeHub } from "@/components/teacher/practice";
import { TeacherMathAnalytics } from "@/components/teacher/analytics/TeacherMathAnalytics";
import { useTeacherDashboardData, type DashboardBatch } from "@/hooks/useTeacherDashboardData";
import { ClassCarousel } from "@/components/teacher/dashboard/ClassCarousel";
import { RenameClassDialog } from "@/components/teacher/dashboard/RenameClassDialog";
import { ChecklistLauncherDialog } from "@/components/teacher/checklist/ChecklistLauncherDialog";
import { TeacherModeDock } from "@/components/teacher/dashboard/TeacherModeDock";
import { useHaptics } from "@/hooks/useHaptics";

type DashboardMode = "dashboard" | "analytics" | "practice";

const MODE_ORDER: DashboardMode[] = ["dashboard", "analytics", "practice"];


export default function TeacherDashboard() {
  const { teacherName, signOut, isLoading: authLoading } = useTeacherAuth();
  const [selectedIntake, setSelectedIntake] = useState<string>("current");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<DashboardMode>("dashboard");
  const [slideDirection, setSlideDirection] = useState(0);
  const [qrBatch, setQrBatch] = useState<DashboardBatch | null>(null);
  const [renameBatch, setRenameBatch] = useState<DashboardBatch | null>(null);
  const [globalChecklistOpen, setGlobalChecklistOpen] = useState(false);
  const navigate = useNavigate();
  const haptic = useHaptics();

  const { data: allBatches = [], isLoading } = useTeacherDashboardData(teacherName);

  // Handle mode change with direction tracking
  const handleModeChange = (newMode: DashboardMode) => {
    const currentIndex = MODE_ORDER.indexOf(activeMode);
    const newIndex = MODE_ORDER.indexOf(newMode);
    setSlideDirection(newIndex > currentIndex ? 1 : -1);
    setActiveMode(newMode);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login?role=teacher");
  };

  const intakes = useMemo(
    () => [
      { label: "Active Classes", value: "current" },
      { label: "Completed Classes", value: "previous" },
      { label: "All Classes", value: "all" },
    ],
    []
  );

  const batches = useMemo(() => {
    if (selectedIntake === "current") return allBatches.filter((b) => !b.metrics.isCompleted);
    if (selectedIntake === "previous") return allBatches.filter((b) => b.metrics.isCompleted);
    return allBatches;
  }, [allBatches, selectedIntake]);

  const groupedBatches = useMemo(() => {
    if (selectedIntake !== "all") return { ungrouped: batches };
    const groups: Record<string, DashboardBatch[]> = {};
    batches.forEach((b) => {
      const d = new Date(b.start_date);
      const key = `${d.toLocaleString("en-US", { month: "short" })} ${d.getFullYear()}`;
      (groups[key] ||= []).push(b);
    });
    return groups;
  }, [batches, selectedIntake]);

  const slideVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? "100%" : "-100%", opacity: 0 }),
  };
  const slideTransition = { type: "spring" as const, stiffness: 200, damping: 27, mass: 1.2 };

  const DashboardContent = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-2 md:p-3 bg-card/60 backdrop-blur rounded-2xl border">
        <Select
          value={selectedIntake}
          onValueChange={(v) => {
            haptic("light");
            setSelectedIntake(v);
          }}
        >
          <SelectTrigger className="h-9 rounded-xl text-sm flex-1 md:max-w-xs border-0 bg-transparent">
            <SelectValue placeholder="Select intake" />
          </SelectTrigger>
          <SelectContent>
            {intakes.map((i) => (
              <SelectItem key={i.value} value={i.value} className="text-sm">
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground whitespace-nowrap pr-2">
          {batches.length} class{batches.length !== 1 ? "es" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-64 rounded-3xl bg-gradient-to-br from-muted/50 to-muted/20 animate-pulse"
            />
          ))}
        </div>
      ) : batches.length === 0 ? (
        <Card className="rounded-3xl">
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            No {selectedIntake === "current" ? "active" : selectedIntake === "previous" ? "completed" : ""} classes
          </CardContent>
        </Card>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedIntake}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 260, damping: 30, mass: 0.9 }}
          >
            {selectedIntake === "all" ? (
              <div className="space-y-6">
                {Object.entries(groupedBatches).map(
                  ([key, list]) =>
                    key !== "ungrouped" && (
                      <div key={key} className="space-y-2">
                        <h4 className="text-xs font-medium text-muted-foreground px-1 sticky top-0 bg-background/80 backdrop-blur py-1 z-10">
                          {key}
                        </h4>
                        <ClassCarousel batches={list} onRename={setRenameBatch} onShowQR={setQrBatch} />
                      </div>
                    )
                )}
              </div>
            ) : (
              <ClassCarousel batches={batches} onRename={setRenameBatch} onShowQR={setQrBatch} />
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );


  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted overflow-x-hidden">
        <div className={`w-full max-w-[1600px] mx-auto p-3 md:p-6 lg:p-8 pb-24 transition-[padding] duration-300 ${activeMode === "practice" ? "md:pl-20" : ""}`}>
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 md:h-9 md:w-9"
                onClick={() => setGlobalChecklistOpen(true)}
                title="Handbook"
              >
                <ClipboardList className="h-4 w-4" />
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
              {activeMode === "analytics" && (
                <motion.div
                  key="analytics"
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                >
                  <TeacherMathAnalytics batches={allBatches} />
                </motion.div>
              )}
              {activeMode === "practice" && (
                <motion.div
                  key="practice"
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                >
                  <TeacherPracticeHub />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Mode navigation toolbar — draggable, snaps to any of the 4 screen edges (iPadOS-style) */}
        <TeacherModeDock
          activeMode={activeMode}
          onChange={handleModeChange}
          onOpenHandbook={() => {
            haptic("light");
            navigate("/teacher/checklist");
          }}
        />
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!qrBatch} onOpenChange={(open) => !open && setQrBatch(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center text-sm">Student Onboarding QR</DialogTitle>
            <p className="text-xs text-muted-foreground text-center">
              {qrBatch?.nickname || qrBatch?.batch_name}
            </p>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeComponent
                value={`https://flowersos.co/register?batch=${qrBatch?.id}`}
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

      <RenameClassDialog
        batchId={renameBatch?.id ?? null}
        currentNickname={renameBatch?.nickname ?? null}
        fallbackName={renameBatch?.batch_name ?? ""}
        onOpenChange={(open) => !open && setRenameBatch(null)}
      />

      <ChecklistLauncherDialog
        open={globalChecklistOpen}
        onOpenChange={setGlobalChecklistOpen}
        batchId={null}
        title="My checklist"
      />
    </TooltipProvider>
  );
}
