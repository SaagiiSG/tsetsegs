import {
  Plus, Users, BarChart3, Settings, FileQuestion, GraduationCap, Building2,
  UserCheck, ClipboardList, Search, QrCode, CalendarDays, LayoutDashboard,
  Wrench, Shield, BookOpen, Trophy, LineChart, Armchair, Bug, UserPlus, MessageSquare, Megaphone, Database, Flame, Clapperboard, RefreshCw, Download,
} from "lucide-react";

export type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  devOnly?: boolean;
};

export type MenuSection = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
  defaultOpen: boolean;
  /** HSL triplet for the section's atmospheric glow in the sidebar. */
  glow: string;
};

export const menuSections: MenuSection[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    glow: "217 91% 60%",
    items: [
      { title: "Dashboard", url: "/admin", icon: BarChart3, end: true },
      { title: "Analytics", url: "/admin/analytics", icon: LineChart },
      { title: "Class Overview", url: "/admin/overview", icon: ClipboardList },
      { title: "International Customers", url: "/admin/customers", icon: Building2 },
    ],
    defaultOpen: true,
  },
  {
    label: "Batches",
    icon: GraduationCap,
    glow: "262 83% 62%",
    items: [
      { title: "All Batches", url: "/admin/batches", icon: GraduationCap },
      { title: "Create Batch", url: "/admin/create", icon: Plus },
    ],
    defaultOpen: true,
  },
  {
    label: "Students",
    icon: Users,
    glow: "152 60% 42%",
    items: [
      { title: "Search", url: "/admin/search", icon: Search },
      { title: "Accounts", url: "/admin/students", icon: UserCheck },
      { title: "Registration Queue", url: "/admin/registration-queue", icon: UserPlus },
    ],
    defaultOpen: false,
  },
  {
    label: "Tools",
    icon: Wrench,
    glow: "32 95% 50%",
    items: [
      { title: "SAT Schedule", url: "/admin/sat-schedule", icon: CalendarDays },
      { title: "Registration", url: "/register/admin", icon: QrCode },
      { title: "Question Bank", url: "/admin/questions", icon: FileQuestion },
      { title: "Search Questions", url: "/admin/question-search", icon: Search },
      { title: "Concept Videos", url: "/admin/concept-videos", icon: Clapperboard },
      { title: "External DB Update", url: "/admin/question-sync", icon: RefreshCw },
      { title: "Import Questions", url: "/admin/question-import", icon: Download },
      { title: "Bluebook", url: "/admin/bluebook", icon: BookOpen, devOnly: true },
      { title: "Sprint Monitor", url: "/admin/sprint-monitor", icon: Trophy },
      { title: "Review Sessions", url: "/admin/review-sessions", icon: Armchair },
      { title: "NGEE Course", url: "/admin/ngee", icon: QrCode },
      { title: "Bug Reports", url: "/admin/bug-reports", icon: Bug },
      { title: "Announcements", url: "/admin/announcements", icon: Megaphone },
    ],
    defaultOpen: true,
  },
  {
    label: "Admin",
    icon: Shield,
    glow: "345 75% 55%",
    items: [
      { title: "Team", url: "/admin/team", icon: Users },
      { title: "Database Health", url: "/admin/database-health", icon: Database },
      { title: "Burner Admin", url: "/admin/burner", icon: Flame, devOnly: true },
      { title: "Settings", url: "/admin/settings", icon: Settings },
    ],
    defaultOpen: false,
  },
];

export const allMenuItems: MenuItem[] = menuSections.flatMap((s) => s.items);
