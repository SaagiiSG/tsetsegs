import { Plus, Users, BarChart3, Settings, FileQuestion, GraduationCap, UserCheck, ClipboardList, Search, QrCode, CalendarDays, ChevronDown, LayoutDashboard, Wrench, Shield, BookOpen, Trophy, LineChart, Armchair, Bug, UserPlus } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import flowersLogo from "@/assets/flowers-logo.png";
import { motion, AnimatePresence } from "framer-motion";
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
};

// Menu sections with their items
const menuSections: MenuSection[] = [
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

export function AdminSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar className={cn("border-r-0", open ? "w-60" : "w-14")} collapsible="icon">
      <SidebarContent className="pt-4 bg-sidebar">
        {/* Logo and Title */}
        <motion.div 
          className="px-3 pb-4 mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center gap-3">
            <motion.img
              src={flowersLogo}
              alt="Flowers Talent Agency"
              className="w-10 h-10 rounded-lg flex-shrink-0 object-contain"
              whileHover={{ scale: 1.05, rotate: 2 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
            />
            <AnimatePresence mode="wait">
              {open && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="font-bold text-sm">Flowers Talent Agency</h2>
                  <p className="text-xs text-muted-foreground">Admin Dashboard</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <motion.div
            key={section.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: sectionIndex * 0.05 }}
          >
            <SidebarGroup className="py-0">
              <Collapsible defaultOpen={section.defaultOpen} className="group/collapsible">
                <SidebarGroupLabel asChild className="px-2">
                  <CollapsibleTrigger className="flex w-full items-center justify-between py-2 hover:bg-muted/50 rounded-md transition-all duration-200">
                    <div className="flex items-center gap-2">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <section.icon className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                      <AnimatePresence mode="wait">
                        {open && (
                          <motion.span 
                            className="text-xs font-medium uppercase tracking-wider"
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -5 }}
                            transition={{ duration: 0.15 }}
                          >
                            {section.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence mode="wait">
                      {open && (
                        <motion.div
                          initial={{ opacity: 0, rotate: -90 }}
                          animate={{ opacity: 1, rotate: 0 }}
                          exit={{ opacity: 0, rotate: -90 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up overflow-hidden">
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items.map((item, itemIndex) => (
                        <motion.div
                          key={item.title}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: itemIndex * 0.03 }}
                        >
                          <SidebarMenuItem>
                            <SidebarMenuButton asChild>
                              <NavLink
                                to={item.url}
                                end={item.end}
                                className={cn(
                                  "hover:bg-muted/50 transition-all duration-200 group/item relative",
                                  open ? "pl-6" : "justify-center"
                                )}
                                activeClassName="bg-primary/10 text-primary font-medium [&_.active-dot]:opacity-100 [&_.active-dot]:scale-100"
                              >
                                {/* Active indicator dot */}
                                <motion.span 
                                  className="active-dot absolute left-1.5 w-1.5 h-1.5 rounded-full bg-primary opacity-0 scale-0 transition-all duration-200"
                                  layoutId="activeDot"
                                />
                                <motion.div
                                  whileHover={{ scale: 1.1 }}
                                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                  <item.icon className="h-4 w-4 flex-shrink-0 transition-colors group-hover/item:text-primary" />
                                </motion.div>
                                <AnimatePresence mode="wait">
                                  {open && (
                                    <motion.span 
                                      className="truncate"
                                      initial={{ opacity: 0, x: -5 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -5 }}
                                      transition={{ duration: 0.15 }}
                                    >
                                      {item.title}
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        </motion.div>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </Collapsible>
            </SidebarGroup>
          </motion.div>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
