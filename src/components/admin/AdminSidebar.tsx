import { Plus, Users, BarChart3, Settings, FileQuestion, GraduationCap, UserCheck, ClipboardList, Search, QrCode, CalendarDays, ChevronDown, LayoutDashboard, BookOpen, Wrench, Shield } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import flowersLogo from "@/assets/flowers-logo.png";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
};

type MenuSection = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
  defaultOpen: boolean;
  devItems?: MenuItem[];
};

// Menu sections with their items
const menuSections: MenuSection[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/admin", icon: BarChart3, end: true },
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
    ],
    defaultOpen: false,
  },
  {
    label: "Tools",
    icon: Wrench,
    items: [
      { title: "SAT Schedule", url: "/admin/sat-schedule", icon: CalendarDays },
      { title: "Registration", url: "/register/admin", icon: QrCode },
      // Question Bank added conditionally below
    ],
    defaultOpen: false,
    devItems: [
      { title: "Question Bank", url: "/admin/questions", icon: FileQuestion },
    ],
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

// Process sections to add dev-only items
const processedSections = menuSections.map(section => ({
  ...section,
  items: import.meta.env.DEV && section.devItems 
    ? [...section.items, ...section.devItems]
    : section.items,
}));

export function AdminSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar className={open ? "w-60" : "w-14"} collapsible="icon">
      <SidebarContent className="pt-4">
        {/* Logo and Title */}
        <div className="px-3 pb-4 mb-2 border-b">
          <div className="flex items-center gap-3">
            <img
              src={flowersLogo}
              alt="Flowers Talent Agency"
              className="w-10 h-10 rounded-lg flex-shrink-0 object-contain"
            />
            {open && (
              <div>
                <h2 className="font-bold text-sm">Flowers Talent Agency</h2>
                <p className="text-xs text-muted-foreground">Admin Dashboard</p>
              </div>
            )}
          </div>
        </div>

        {/* Menu Sections */}
        {processedSections.map((section) => (
          <SidebarGroup key={section.label} className="py-0">
            <Collapsible defaultOpen={section.defaultOpen} className="group/collapsible">
              <SidebarGroupLabel asChild className="px-2">
                <CollapsibleTrigger className="flex w-full items-center justify-between py-2 hover:bg-muted/50 rounded-md transition-colors">
                  <div className="flex items-center gap-2">
                    <section.icon className="h-4 w-4 text-muted-foreground" />
                    {open && <span className="text-xs font-medium uppercase tracking-wider">{section.label}</span>}
                  </div>
                  {open && (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  )}
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.url}
                            end={item.end}
                            className={cn(
                              "hover:bg-muted/50 transition-colors",
                              open ? "pl-6" : "justify-center"
                            )}
                            activeClassName="bg-primary/10 text-primary font-medium border-l-2 border-primary"
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            {open && <span className="truncate">{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
