import {
  Plus, Users, BarChart3, Settings, FileQuestion, GraduationCap,
  UserCheck, ClipboardList, Search, QrCode, CalendarDays, LayoutDashboard,
  Wrench, Shield, BookOpen, Trophy, LineChart, Armchair, Bug, UserPlus,
} from "lucide-react";

export type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

export type MenuSection = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
  defaultOpen: boolean;
};

export const menuSections: MenuSection[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/admin", icon: BarChart3, end: true },
      { title: "Analytics", url: "/admin/analytics", icon: LineChart },
      { title: "Class Overview", url: "/admin/overview", icon: ClipboardList },
    ],
    defaultOpen: true,
  },
  {
    label: "Batches",
    icon: GraduationCap,
    items: [
      { title: "All Batches", url: "/admin/batches", icon: GraduationCap },
      { title: "Create Batch", url: "/admin/create", icon: Plus },
    ],
    defaultOpen: true,
  },
  {
    label: "Students",
    icon: Users,
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
    items: [
      { title: "SAT Schedule", url: "/admin/sat-schedule", icon: CalendarDays },
      { title: "Registration", url: "/register/admin", icon: QrCode },
      { title: "Question Bank", url: "/admin/questions", icon: FileQuestion },
      { title: "Bluebook", url: "/admin/bluebook", icon: BookOpen },
      { title: "Sprint Monitor", url: "/admin/sprint-monitor", icon: Trophy },
      { title: "Review Sessions", url: "/admin/review-sessions", icon: Armchair },
      { title: "Bug Reports", url: "/admin/bug-reports", icon: Bug },
    ],
    defaultOpen: false,
  },
  {
    label: "Admin",
    icon: Shield,
    items: [
      { title: "Team", url: "/admin/team", icon: Users },
      { title: "Settings", url: "/admin/settings", icon: Settings },
    ],
    defaultOpen: false,
  },
];

export const allMenuItems: MenuItem[] = menuSections.flatMap((s) => s.items);
