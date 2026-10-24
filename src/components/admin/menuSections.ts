import {
  Plus, Users, BarChart3, Settings, FileQuestion, GraduationCap, Building2,
  UserCheck, ClipboardList, Search, QrCode, CalendarDays, LayoutDashboard,
  Wrench, Shield, BookOpen, Trophy, LineChart, Armchair, Bug, UserPlus, MessageSquare, Megaphone, Database, Flame, Clapperboard, LifeBuoy,
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
      { title: "Platform Overview", url: "/admin", icon: BarChart3, end: true },
      { title: "Insights", url: "/admin/analytics", icon: LineChart },
      { title: "Class Overview", url: "/admin/overview", icon: ClipboardList },
      { title: "International Customers", url: "/admin/customers", icon: Building2 },
      { title: "Demo Requests", url: "/admin/demo-requests", icon: CalendarDays },
      { title: "Support Requests", url: "/admin/support", icon: LifeBuoy },
    ],
    defaultOpen: true,
  },
  {
    label: "Tsetsegs Workspace",
    icon: Flame,
    glow: "12 85% 60%",
    items: [
      { title: "Tsetsegs Dashboard", url: "/admin/tsetsegs/dashboard", icon: LayoutDashboard },
      { title: "Tsetsegs Analytics", url: "/admin/tsetsegs/analytics", icon: LineChart },
      { title: "Tsetsegs Batches", url: "/admin/batches", icon: GraduationCap },
      { title: "Student Management", url: "/admin/students", icon: Users },
      { title: "SAT Schedule", url: "/admin/sat-schedule", icon: CalendarDays },
      { title: "Question Bank", url: "/admin/questions", icon: FileQuestion },
      { title: "Sprint Monitor", url: "/admin/sprint-monitor", icon: Trophy },
      { title: "Review Sessions", url: "/admin/review-sessions", icon: Armchair },
      { title: "NGEE Course", url: "/admin/ngee", icon: QrCode },
    ],
    defaultOpen: true,
  },
  {
    label: "Tools",
    icon: Wrench,
    glow: "32 95% 50%",
    items: [
      { title: "Search Questions", url: "/admin/question-search", icon: Search },
      { title: "Concept Videos", url: "/admin/concept-videos", icon: Clapperboard },
      { title: "INT DB Questions", url: "/admin/intl-questions", icon: Database },
      { title: "Bluebook", url: "/admin/bluebook", icon: BookOpen, devOnly: true },
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
