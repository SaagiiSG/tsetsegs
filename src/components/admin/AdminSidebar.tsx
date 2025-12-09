import { Plus, Users, UserCog, BarChart3, Settings, FileQuestion, GraduationCap } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import flowersLogo from '@/assets/flowers-logo.png';
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
} from '@/components/ui/sidebar';

const isDev = import.meta.env.DEV;

const menuItems = [
  { title: 'Dashboard', url: '/admin', icon: BarChart3, end: true },
  { title: 'Batches', url: '/admin/batches', icon: GraduationCap },
  { title: 'Create Batch', url: '/admin/create', icon: Plus },
  ...(isDev ? [{ title: 'Question Bank', url: '/admin/questions', icon: FileQuestion }] : []),
  { title: 'Teachers', url: '/admin/teachers', icon: UserCog },
  { title: 'Users', url: '/admin/users', icon: Users },
  { title: 'Settings', url: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar className={open ? 'w-60' : 'w-14'} collapsible="icon">
      <SidebarContent className="pt-4">
        {/* Logo and Title */}
        <div className="px-3 pb-4 mb-4 border-b">
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

        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.end}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-6 w-6" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
