import { NavLink } from '@/components/NavLink';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { motion } from 'framer-motion';
import { Home, BookOpen, Headphones, PenLine, Mic, LogOut, User, Lock } from 'lucide-react';
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
  useSidebar,
} from '@/components/ui/sidebar';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  disabled?: boolean;
  end?: boolean;
}

const mainItems: NavItem[] = [
  { to: '/ielts/dashboard', icon: Home, label: 'Dashboard', end: true },
];

const comingSoonItems: NavItem[] = [
  { to: '#', icon: BookOpen, label: 'Reading', disabled: true },
  { to: '#', icon: Headphones, label: 'Listening', disabled: true },
  { to: '#', icon: PenLine, label: 'Writing', disabled: true },
  { to: '#', icon: Mic, label: 'Speaking', disabled: true },
];

export function IELTSSidebar() {
  const { student, logout } = useStudentAuth();
  const { open } = useSidebar();

  const ieltsLinked =
    student?.linked_students?.find((s) => s.course_type === 'IELTS') ??
    student?.linked_student ??
    null;
  const studentName = ieltsLinked
    ? `${ieltsLinked.first_name}${ieltsLinked.last_name ? ' ' + ieltsLinked.last_name.charAt(0) + '.' : ''}`
    : student?.phone_number || 'Student';

  const renderItem = (item: NavItem) => {
    if (item.disabled) {
      return (
        <SidebarMenuItem key={item.label}>
          <SidebarMenuButton
            disabled
            className={cn(
              'opacity-50 cursor-not-allowed',
              open ? '' : 'justify-center'
            )}
          >
            <item.icon className="h-4 w-4" />
            {open && (
              <span className="ml-2 flex items-center gap-2">
                {item.label}
                <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" />
                  Soon
                </span>
              </span>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    }
    return (
      <SidebarMenuItem key={item.to}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.to}
            end={item.end}
            className={cn(
              'hover:bg-muted/50 transition-all duration-200 relative',
              open ? '' : 'justify-center'
            )}
            activeClassName="bg-primary/10 text-primary font-medium"
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <item.icon className="h-4 w-4" />
            </motion.div>
            {open && <span className="ml-2">{item.label}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="offcanvas" variant="floating" className="border-r-0">
      <SidebarHeader className="border-b">
        <div className={cn('flex items-center gap-3 p-2', !open && 'justify-center')}>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          {open && (
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold truncate text-sm">{studentName}</h2>
              <p className="text-xs text-muted-foreground">IELTS Prep</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          {open && <SidebarGroupLabel>Practice (coming soon)</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{comingSoonItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <Button
          variant="ghost"
          className={cn(
            'w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs md:text-sm',
            open ? 'justify-start gap-2' : 'justify-center p-2'
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
