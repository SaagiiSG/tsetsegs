import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProctorContent } from "@/components/teacher/proctor/ProctorContent";

export default function TeacherProctor() {
  const navigate = useNavigate();

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <div className="w-full max-w-[1400px] mx-auto p-3 md:p-6 lg:p-8 pb-24">
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
                <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
                Proctored test
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                Run a Bluebook practice test under your supervision
              </p>
            </div>
          </div>

          <ProctorContent />
        </div>
      </div>
    </TooltipProvider>
  );
}
