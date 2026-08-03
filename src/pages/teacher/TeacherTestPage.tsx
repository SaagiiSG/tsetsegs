import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TeacherTestTab } from "@/components/teacher/practice/test/TeacherTestTab";

export default function TeacherTestPage() {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="w-full max-w-[1200px] mx-auto p-3 md:p-6 lg:p-8 pb-24">
          <div className="flex items-center gap-2 mb-4 md:mb-6">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => navigate("/teacher/dashboard")}
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2 truncate">
                <ClipboardList className="h-5 w-5 text-primary shrink-0" />
                Class Tests
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Launch and monitor the 68 Hardest 22 timed test
              </p>
            </div>
          </div>

          <TeacherTestTab />
        </div>
      </div>
    </TooltipProvider>
  );
}
