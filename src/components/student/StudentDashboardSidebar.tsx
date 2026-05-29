import { useState } from 'react';
import { NavLink } from '@/components/NavLink';
import { CheckInWidget } from './CheckInWidget';
import { ExternalResourcesPopover } from './ExternalResourcesPopover';
import { SATCountdownWidget } from './SATCountdownWidget';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { motion } from 'framer-motion';
import { 
  Home, BookOpen, Zap, Brain, BarChart3, Trophy, Settings, LogOut, User, Languages,
  ChevronDown, ChevronRight, FileText, Armchair, Megaphone
} from 'lucide-react';
import { useStudentAnnouncements } from '@/hooks/useStudentAnnouncements';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}

const learningItems: NavItem[] = [
  { to: '/practice/dashboard', icon: BookOpen, label: 'Practice' },
  { to: '/practice/bluebook', icon: FileText, label: 'Practice Tests' },
  { to: '/practice/speed', icon: Zap, label: 'Speed Mode' },
  { to: '/practice/review', icon: Brain, label: 'Review' },
];

const toolsItems: NavItem[] = [
  { to: '/practice/booking', icon: Armchair, label: 'Book Seat' },
  { to: '/practice/vocabulary', icon: Languages, label: 'Vocabulary' },
  { to: '/practice/stats', icon: BarChart3, label: 'Statistics' },
];

const accountItems: NavItem[] = [
  { to: '/practice/profile', icon: User, label: 'Profile' },
  { to: '/practice/settings', icon: Settings, label: 'Settings' },
];

export function StudentDashboardSidebar() {
  const { student, logout } = useStudentAuth();
  const { open } = useSidebar();
  const [learningOpen, setLearningOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);
  const { data: annData } = useStudentAnnouncements();
  const unread = annData?.unreadCount ?? 0;

  const studentName = student?.linked_student 
    ? `${student.linked_student.first_name}${student.linked_student.last_name ? ' ' + student.linked_student.last_name.charAt(0) + '.' : ''}`
    : student?.phone_number || 'Student';

  const renderNavItem = (item: NavItem) => (
    <SidebarMenuItem key={item.to}>
      <SidebarMenuButton asChild>
        <NavLink
          to={item.to}
          end={item.end}
          className={cn(
            "hover:bg-muted/50 transition-all duration-200 group/item relative",
            open ? "" : "justify-center"
          )}
          activeClassName="bg-primary/10 text-primary font-medium [&_.active-dot]:opacity-100 [&_.active-dot]:scale-100"
        >
          <motion.span 
            className="active-dot absolute left-1.5 w-1.5 h-1.5 rounded-full bg-primary opacity-0 scale-0 transition-all duration-200"
            layoutId="studentActiveDot"
          />
          <motion.div
            whileHover={{ scale: 1.1 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <item.icon className="h-4 w-4" />
          </motion.div>
          {open && <span className="ml-2">{item.label}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="offcanvas" variant="floating" className="border-r-0">
      <SidebarHeader className="border-b">
        <div className={cn(
          "flex items-center gap-3 p-2",
          !open && "justify-center"
        )}>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          {open && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 min-w-0"
            >
              <h2 className="font-semibold truncate text-sm">{studentName}</h2>
              <p className="text-xs text-muted-foreground">SAT Practice</p>
            </motion.div>
          )}
        </div>
        {/* SAT Countdown */}
        {open && (
          <div className="px-2 pb-2">
            <SATCountdownWidget variant="sidebar" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Home & Leaderboard */}
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/practice/home"
                  end
                  className={cn(
                    "hover:bg-muted/50 transition-all duration-200 group/item relative",
                    open ? "" : "justify-center"
                  )}
                  activeClassName="bg-primary/10 text-primary font-medium [&_.active-dot]:opacity-100 [&_.active-dot]:scale-100"
                >
                  <motion.span 
                    className="active-dot absolute left-1.5 w-1.5 h-1.5 rounded-full bg-primary opacity-0 scale-0 transition-all duration-200"
                    layoutId="studentActiveDot"
                  />
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Home className="h-4 w-4" />
                  </motion.div>
                  {open && <span className="ml-2">Dashboard</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/practice/leaderboard"
                  className={cn(
                    "hover:bg-muted/50 transition-all duration-200 group/item relative",
                    open ? "" : "justify-center"
                  )}
                  activeClassName="bg-primary/10 text-primary font-medium [&_.active-dot]:opacity-100 [&_.active-dot]:scale-100"
                >
                  <motion.span 
                    className="active-dot absolute left-1.5 w-1.5 h-1.5 rounded-full bg-primary opacity-0 scale-0 transition-all duration-200"
                    layoutId="studentActiveDot"
                  />
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Trophy className="h-4 w-4" />
                  </motion.div>
                  {open && <span className="ml-2">Leaderboard</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink
                  to="/practice/announcements"
                  className={cn(
                    "hover:bg-muted/50 transition-all duration-200 group/item relative",
                    open ? "" : "justify-center"
                  )}
                  activeClassName="bg-primary/10 text-primary font-medium [&_.active-dot]:opacity-100 [&_.active-dot]:scale-100"
                >
                  <motion.span 
                    className="active-dot absolute left-1.5 w-1.5 h-1.5 rounded-full bg-primary opacity-0 scale-0 transition-all duration-200"
                    layoutId="studentActiveDot"
                  />
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className="relative"
                  >
                    <Megaphone className="h-4 w-4" />
                    {unread > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    )}
                  </motion.div>
                  {open && (
                    <span className="ml-2 flex items-center gap-2">
                      Announcements
                      {unread > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                          {unread}
                        </span>
                      )}
                    </span>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* Learning Section */}
        <Collapsible open={learningOpen} onOpenChange={setLearningOpen}>
          <SidebarGroup>
            {open && (
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-muted/30 rounded-md transition-colors flex items-center justify-between pr-2">
                  <span>Learning</span>
                  {learningOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
            )}
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {learningItems.map(renderNavItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Tools Section */}
        <Collapsible open={toolsOpen} onOpenChange={setToolsOpen}>
          <SidebarGroup>
            {open && (
              <CollapsibleTrigger asChild>
                <SidebarGroupLabel className="cursor-pointer hover:bg-muted/30 rounded-md transition-colors flex items-center justify-between pr-2">
                  <span>Tools</span>
                  {toolsOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </SidebarGroupLabel>
              </CollapsibleTrigger>
            )}
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {toolsItems.map(renderNavItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        {/* Account Section */}
        <SidebarGroup>
          {open && <SidebarGroupLabel>Account</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {accountItems.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* Check-in Widget */}
        {open && (
          <SidebarGroup>
            <SidebarGroupContent>
              <CheckInWidget variant="sidebar" />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-1.5 md:p-2 space-y-1">
        <ExternalResourcesPopover collapsed={!open} />
        <Button 
          variant="ghost" 
          className={cn(
            "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs md:text-sm",
            open ? "justify-start gap-2 md:gap-3" : "justify-center p-2"
          )}
          onClick={logout}
        >
          <LogOut className="h-3.5 w-3.5 md:h-4 md:w-4" />
          {open && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
