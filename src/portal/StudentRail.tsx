import { NavLink } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  Home, BookOpen, RotateCcw, Zap, Trophy, PlayCircle, Award, BarChart3, LifeBuoy, UserRound, Settings, Moon, LogOut,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';

export const NAV = [
  { to: '/student', label: 'Home', icon: Home, end: true },
  { to: '/student/practice', label: 'Practice', icon: BookOpen },
  { to: '/student/videos', label: 'Concept videos', icon: PlayCircle },
  { to: '/student/speed', label: 'Speed mode', icon: Zap },
  { to: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/student/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/student/review', label: 'Review mistakes', icon: RotateCcw },
  { to: '/student/badges', label: 'Badges', icon: Award },
  { to: '/student/help', label: 'Help', icon: LifeBuoy },
];

const row = 'sky-nav flex h-12 w-full items-center gap-4 rounded-full px-[1.15rem] text-base transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
// Labels stay in the DOM (screen readers) and only fade in while the rail is open.
const label = 'whitespace-nowrap opacity-0 transition-opacity duration-200 motion-reduce:transition-none group-hover/rail:opacity-100 group-focus-within/rail:opacity-100';

/** Desktop sidebar: icons only at rest, opens over the page on hover or keyboard focus. */
export function StudentRail() {
  const { center, signOut } = useCenter();
  const { resolvedTheme, setTheme } = useTheme();
  const link = ({ isActive }: { isActive: boolean }) => `${row} ${isActive ? 'font-medium' : ''}`;
  return (
    <aside className="group/rail hidden lg:flex fixed left-4 top-4 bottom-4 z-40 w-20 hover:w-60 focus-within:w-60 flex-col overflow-hidden sky-sidebar p-3 transition-[width] duration-300 motion-reduce:transition-none">
      <div className="flex items-center gap-3 px-1 pt-2 pb-4">
        <CenterLogo center={center} className="h-11 w-11 shrink-0 sky-avatar" />
        <p className={`min-w-0 truncate font-semibold ${label}`}>{centerDisplayName(center)}</p>
      </div>
      <nav aria-label="Student" className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
        {NAV.map(({ to, label: text, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={link}><Icon className="h-5 w-5 shrink-0" /><span className={label}>{text}</span></NavLink>
        ))}
      </nav>
      <div className="mx-2 my-2 h-px bg-border/60" />
      <div className="space-y-2">
        <NavLink to="/student/profile" className={link}><UserRound className="h-5 w-5 shrink-0" /><span className={label}>Profile</span></NavLink>
        <NavLink to="/student/settings" className={link}><Settings className="h-5 w-5 shrink-0" /><span className={label}>Settings</span></NavLink>
        <label className={`${row} cursor-pointer`}>
          <Moon className="h-5 w-5 shrink-0" /><span className={`flex-1 ${label}`}>Dark mode</span>
          <Switch className={label} checked={resolvedTheme === 'dark'} onCheckedChange={c => setTheme(c ? 'dark' : 'light')} />
        </label>
        <button type="button" onClick={signOut} className={`${row} text-destructive`}><LogOut className="h-5 w-5 shrink-0" /><span className={label}>Log out</span></button>
      </div>
    </aside>
  );
}
