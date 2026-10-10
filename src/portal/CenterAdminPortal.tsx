import { useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  BarChart3, CalendarCheck, FolderPlus, GraduationCap, Inbox, LayoutDashboard, LogOut, Megaphone, Menu,
  Search, Settings, Trophy, Users, Layers, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';
import { useCenterAdminData } from './admin/useCenterAdminData';
import { DashboardPage, AnalyticsPage, ClassOverviewPage } from './admin/OverviewPages';
import { BatchesPage, CreateBatchPage } from './admin/BatchPages';
import { StudentsPage, StudentDetailPage, RegistrationsPage } from './admin/StudentPages';
import { QuestionsPage, SprintsPage, AnnouncementsPage } from './admin/ToolPages';
import { TeamPage, SettingsPage } from './admin/CenterPages';

type Item = { to: string; label: string; icon: typeof LayoutDashboard; badge?: number };

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { center, name, signOut } = useCenter();
  const { data } = useCenterAdminData();
  const sections: { title: string; items: Item[] }[] = [
    { title: 'Overview', items: [
      { to: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: 'analytics', label: 'Analytics', icon: BarChart3 },
      { to: 'class-overview', label: 'Class Overview', icon: CalendarCheck },
    ] },
    { title: 'Batches', items: [
      { to: 'batches', label: 'All Batches', icon: Layers },
      { to: 'batches/new', label: 'Create Batch', icon: FolderPlus },
    ] },
    { title: 'Students', items: [
      { to: 'students', label: 'Search Accounts', icon: GraduationCap },
      { to: 'registrations', label: 'Registration Queue', icon: Inbox, badge: data?.pendingRegistrations },
    ] },
    { title: 'Tools', items: [
      { to: 'questions', label: 'Search Questions', icon: Search },
      { to: 'sprints', label: 'Sprint Monitor', icon: Trophy },
      { to: 'announcements', label: 'Announcements', icon: Megaphone },
    ] },
    { title: 'Center', items: [
      { to: 'team', label: 'Team', icon: Users },
      { to: 'settings', label: 'Settings', icon: Settings },
    ] },
  ];
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 h-16 border-b">
        <CenterLogo center={center} className="h-9 w-9" />
        <div className="min-w-0"><p className="font-chillax font-semibold truncate leading-tight">{centerDisplayName(center)}</p><p className="text-xs text-muted-foreground">Center admin</p></div>
      </div>
      <nav aria-label="Center admin" className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {sections.map(s => (
          <div key={s.title}>
            <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{s.title}</p>
            <ul className="space-y-0.5">{s.items.map(i => (
              <li key={i.to}><NavLink to={`/admin/${i.to}`} end onClick={onNavigate}
                className={({ isActive }) => `flex items-center gap-2.5 rounded-md px-2 h-8 text-sm transition-colors ${isActive ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}`}>
                <i.icon className="h-4 w-4 shrink-0" /><span className="flex-1 truncate">{i.label}</span>
                {!!i.badge && <span className="rounded-full bg-primary text-primary-foreground px-1.5 text-[11px] font-mono">{i.badge}</span>}
              </NavLink></li>
            ))}</ul>
          </div>
        ))}
        <div>
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Switch</p>
          <NavLink to="/teacher" onClick={onNavigate} className="flex items-center gap-2.5 rounded-md px-2 h-8 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"><ExternalLink className="h-4 w-4" />Teacher view</NavLink>
        </div>
      </nav>
      <div className="border-t p-3 flex items-center gap-2">
        <span className="flex-1 truncate text-sm text-muted-foreground">{name}</span>
        <Button variant="ghost" size="sm" onClick={signOut}><LogOut className="h-4 w-4" />Sign out</Button>
      </div>
    </div>
  );
}

export default function CenterAdminPortal() {
  const [open, setOpen] = useState(false);
  const { center } = useCenter();
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden lg:block sticky top-0 h-screen border-r admin-navigation-material"><Sidebar /></aside>
      <header className="lg:hidden sticky top-0 z-20 h-14 border-b flex items-center gap-3 px-3 admin-navigation-material">
        <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></Button>
        <CenterLogo center={center} className="h-7 w-7" />
        <span className="font-chillax font-semibold truncate">{centerDisplayName(center)}</span>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="p-0 w-72"><SheetTitle className="sr-only">Menu</SheetTitle><Sidebar onNavigate={() => setOpen(false)} /></SheetContent>
      </Sheet>
      <main key={pathname} className="min-w-0 px-4 py-6 lg:px-10 lg:py-8 max-w-6xl">
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
  );
}
