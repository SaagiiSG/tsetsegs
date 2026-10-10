import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  BarChart3, CalendarCheck, FolderPlus, GraduationCap, Inbox, LayoutDashboard, LogOut, Megaphone, Menu,
  Search, Settings, Trophy, Users, Layers, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';
import { useCenterAdminData } from './admin/useCenterAdminData';
import { DarkModeSetting } from './admin/CenterPages';
import { DashboardPage, AnalyticsPage, ClassOverviewPage } from './admin/OverviewPages';
import { BatchesPage, CreateBatchPage } from './admin/BatchPages';
import { StudentsPage, StudentDetailPage, RegistrationsPage } from './admin/StudentPages';
import { QuestionsPage, SprintsPage, AnnouncementsPage } from './admin/ToolPages';
import { TeamPage, SettingsPage } from './admin/CenterPages';

type Item = { to: string; label: string; icon: typeof LayoutDashboard };
type Section = { title: string; glow: string; items: Item[] };

/** Section glow hues mirror the main admin workspace. */
const SECTIONS: Section[] = [
  { title: 'Overview', glow: '217 91% 60%', items: [
    { to: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: 'analytics', label: 'Analytics', icon: BarChart3 },
    { to: 'class-overview', label: 'Class Overview', icon: CalendarCheck },
  ] },
  { title: 'Batches', glow: '262 83% 62%', items: [
    { to: 'batches', label: 'All Batches', icon: Layers },
    { to: 'batches/new', label: 'Create Batch', icon: FolderPlus },
  ] },
  { title: 'Students', glow: '152 60% 42%', items: [
    { to: 'students', label: 'Search Accounts', icon: GraduationCap },
    { to: 'registrations', label: 'Registration Queue', icon: Inbox },
  ] },
  { title: 'Tools', glow: '32 95% 50%', items: [
    { to: 'questions', label: 'Search Questions', icon: Search },
    { to: 'sprints', label: 'Sprint Monitor', icon: Trophy },
    { to: 'announcements', label: 'Announcements', icon: Megaphone },
  ] },
  { title: 'Center', glow: '345 75% 55%', items: [
    { to: 'team', label: 'Team', icon: Users },
    { to: 'settings', label: 'Settings', icon: Settings },
  ] },
];

const SWITCH_ITEM = { to: '/teacher', label: 'Teacher view', icon: ExternalLink };

const DEFAULT_GLOW = '345 75% 55%';

/** Remember whether the desktop sidebar was collapsed, per browser. */
const COLLAPSE_KEY = 'center:sidebar:collapsed';
const readCollapsed = () => {
  try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
};
const writeCollapsed = (isCollapsed: boolean) => {
  try { localStorage.setItem(COLLAPSE_KEY, isCollapsed ? '1' : '0'); } catch { /* storage unavailable */ }
};

/** Route path relative to the portal root, e.g. "students/abc". */
function relativePath(pathname: string) {
  return pathname.replace(/^\/admin\/?/, '');
}

/** Resolves the current route's section glow and page label so page chrome can match it. */
function useCenterSection(): { glow: string; label: string } {
  const { pathname } = useLocation();
  const rel = relativePath(pathname);
  const section = SECTIONS.find((s) =>
    s.items.some((i) => rel === i.to || rel.startsWith(`${i.to}/`))
  );
  const item = [...(section?.items ?? [])]
    .filter((i) => rel === i.to || rel.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return { glow: section?.glow ?? DEFAULT_GLOW, label: item?.label ?? 'Dashboard' };
}

/**
 * The navigation list, shared by the collapsible desktop sidebar and the
 * mobile drawer. Built on the same sidebar primitives as the main admin so
 * collapsed icons, tooltips and glass hover states behave identically.
 */
function CenterNavList({ onNavigate }: { onNavigate?: () => void }) {
  const { center, name, signOut } = useCenter();
  const { state } = useSidebar();
  const isMobile = useIsMobile();
  // The mobile drawer always shows full labels, even if the desktop bar is collapsed.
  const collapsed = state === 'collapsed' && !isMobile;
  const { data } = useCenterAdminData();
  const { pathname } = useLocation();
  const rel = relativePath(pathname);

  // Longest match wins, so "Create Batch" doesn't light up "All Batches" too.
  const activeTo = SECTIONS.flatMap((s) => s.items)
    .filter((i) => rel === i.to || rel.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;

  return (
    <>
      <SidebarHeader className={cn('gap-0 p-0', collapsed ? 'px-0 py-4' : 'px-4 h-14 justify-center')}>
        <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
          <CenterLogo center={center} className="h-9 w-9 shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-chillax font-semibold truncate leading-tight">{centerDisplayName(center)}</p>
              <p className="text-xs text-muted-foreground">Center admin</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <nav aria-label="Center admin" className="flex-1 min-h-0 overflow-y-auto scrollbar-hide px-2 py-2 space-y-1">
        {SECTIONS.map((s) => (
          <SidebarGroup key={s.title} className="p-0 py-0.5" style={{ '--section-glow': s.glow } as React.CSSProperties}>
            <SidebarGroupLabel className={cn('h-6 px-2 pb-1 uppercase tracking-wider', collapsed && 'hidden')}>
              {s.title}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {s.items.map((i) => {
                  const isActive = activeTo === i.to;
                  const badge = i.to === 'registrations' ? data?.pendingRegistrations : undefined;
                  return (
                    <SidebarMenuItem key={i.to}>
                      <SidebarMenuButton asChild tooltip={i.label} isActive={isActive}>
                        <NavLink
                          to={`/admin/${i.to}`}
                          onClick={onNavigate}
                          aria-label={i.label}
                          className={cn(
                            'admin-control admin-glass-item admin-section-item rounded-lg',
                            isActive ? 'admin-section-active text-foreground font-medium' : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          <i.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{i.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                      {!!badge && <SidebarMenuBadge className="font-mono">{badge}</SidebarMenuBadge>}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="p-0 py-0.5">
          <SidebarGroupLabel className={cn('h-6 px-2 pb-1 uppercase tracking-wider', collapsed && 'hidden')}>Switch</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip={SWITCH_ITEM.label}>
                  <NavLink
                    to={SWITCH_ITEM.to}
                    onClick={onNavigate}
                    aria-label={SWITCH_ITEM.label}
                    className="admin-control admin-glass-item rounded-lg text-muted-foreground hover:text-foreground"
                  >
                    <SWITCH_ITEM.icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{SWITCH_ITEM.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </nav>

      <SidebarFooter className="border-t border-border/50 gap-1">
        {!collapsed && <p className="px-2 pt-1 truncate text-sm text-muted-foreground">{name}</p>}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          aria-label="Sign out"
          className={cn('admin-control w-full justify-start gap-2', collapsed && 'justify-center px-0')}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="truncate text-sm font-medium">Sign out</span>}
        </Button>
      </SidebarFooter>
    </>
  );
}

/** Desktop sidebar: a floating glass card that collapses to an icon strip. */
function CenterSidebar() {
  const isMobile = useIsMobile();
  if (isMobile) return null;
  return (
    <Sidebar className="admin-sidebar-float" variant="floating" collapsible="icon">
      <CenterNavList />
    </Sidebar>
  );
}

export default function CenterAdminPortal() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const { center } = useCenter();
  const { pathname } = useLocation();
  const section = useCenterSection();

  // Reuse the admin theme tokens so the glass/glow styles apply here too.
  useEffect(() => {
    document.body.classList.add('admin-theme');
    return () => document.body.classList.remove('admin-theme');
  }, []);

  return (
    <SidebarProvider
      open={!collapsed}
      onOpenChange={(expanded) => { setCollapsed(!expanded); writeCollapsed(!expanded); }}
    >
      <div className="flex min-h-screen w-full bg-background text-foreground">
        <CenterSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className="md:hidden sticky top-0 z-20 h-14 flex items-center gap-3 px-3 admin-glass-bar"
            style={{ '--section-glow': section.glow } as React.CSSProperties}
          >
            <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
            <CenterLogo center={center} className="h-7 w-7" />
            <span className="font-chillax font-semibold truncate">{centerDisplayName(center)}</span>
            <div className="ml-auto"><DarkModeSetting compact /></div>
          </header>
          {/* Desktop glass top bar: same material, section glow and rounded leading
              corner as the main admin workspace. */}
          <header
            className="admin-glass-bar admin-glass-bar--page hidden md:flex h-14 items-center gap-3 px-4 sticky top-0 z-10"
            style={{ '--section-glow': section.glow } as React.CSSProperties}
          >
            <SidebarTrigger aria-label="Toggle sidebar" />
            <CenterLogo center={center} className="h-6 w-6" />
            <span className="text-sm text-muted-foreground">{section.label}</span>
            <div className="ml-auto"><DarkModeSetting compact /></div>
          </header>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetContent side="left" className="p-0 w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <div className="flex h-full w-full flex-col">
                <CenterNavList onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>
          <main
            key={pathname}
            className="admin-glow-scope admin-main-glow min-w-0 px-4 py-6 md:px-10 md:py-8 max-w-6xl"
            style={{ '--section-glow': section.glow } as React.CSSProperties}
          >
            <Routes>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="class-overview" element={<ClassOverviewPage />} />
              <Route path="batches" element={<BatchesPage />} />
              <Route path="batches/new" element={<CreateBatchPage />} />
              <Route path="students" element={<StudentsPage />} />
              <Route path="students/:studentId" element={<StudentDetailPage />} />
              <Route path="registrations" element={<RegistrationsPage />} />
              <Route path="questions" element={<QuestionsPage />} />
              <Route path="sprints" element={<SprintsPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="team" element={<TeamPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
