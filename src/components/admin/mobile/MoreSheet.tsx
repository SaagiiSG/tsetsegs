import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  CalendarDays, QrCode, FileQuestion, BookOpen, Trophy,
  Armchair, Bug, UserPlus, Users, Settings, ClipboardList, LineChart, UserCheck,
} from "lucide-react";

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const moreItems = [
  { title: "Analytics", url: "/admin/analytics", icon: LineChart },
  { title: "Class Overview", url: "/admin/overview", icon: ClipboardList },
  { title: "Accounts", url: "/admin/students", icon: UserCheck },
  { title: "Registration Queue", url: "/admin/registration-queue", icon: UserPlus },
  { title: "SAT Schedule", url: "/admin/sat-schedule", icon: CalendarDays },
  { title: "Registration", url: "/register/admin", icon: QrCode },
  { title: "Questions", url: "/admin/questions", icon: FileQuestion },
  { title: "Bluebook", url: "/admin/bluebook", icon: BookOpen },
  { title: "Sprints", url: "/admin/sprint-monitor", icon: Trophy },
  { title: "Sessions", url: "/admin/review-sessions", icon: Armchair },
  { title: "Bugs", url: "/admin/bug-reports", icon: Bug },
  { title: "Team", url: "/admin/team", icon: Users },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function MoreSheet({ open, onOpenChange }: MoreSheetProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const go = (url: string) => {
    onOpenChange(false);
    navigate(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left text-base">More</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {moreItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.url}
                onClick={() => go(item.url)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/30 hover:bg-muted/60 active:scale-95 transition-all"
              >
                <span className="w-10 h-10 rounded-lg bg-background flex items-center justify-center">
                  <Icon className="w-5 h-5 text-foreground" />
                </span>
                <span className="text-[11px] font-medium text-center leading-tight">{item.title}</span>
              </button>
            );
          })}
        </div>

        <Button
          variant="outline"
          className="w-full mt-4"
          onClick={() => { onOpenChange(false); signOut(); }}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </SheetContent>
    </Sheet>
  );
}
