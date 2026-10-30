import { useRef, useState, type PointerEvent } from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from 'next-themes';
import {
  Home, BookOpen, ClipboardList, RotateCcw, Zap, Trophy, PlayCircle, Award, BarChart3, LifeBuoy, UserRound, Settings, Moon, LogOut,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { CenterLogo, centerDisplayName, useCenter } from './centerContext';

export const NAV = [
  { to: '/student', label: 'Home', icon: Home, end: true },
  { to: '/student/practice', label: 'Practice', icon: BookOpen },
  { to: '/student/videos', label: 'Concept videos', icon: PlayCircle },
  { to: '/student/tests', label: 'Practice tests', icon: ClipboardList },
  { to: '/student/speed', label: 'Speed mode', icon: Zap },
  { to: '/student/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/student/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/student/review', label: 'Review mistakes', icon: RotateCcw },
  { to: '/student/badges', label: 'Badges', icon: Award },
  { to: '/student/help', label: 'Help', icon: LifeBuoy },
];

// Badges and Help live in the account menu on desktop; the phone dock still lists every NAV page.
const IN_ACCOUNT = new Set(['/student/badges', '/student/help']);
const RAIL_NAV = NAV.filter(n => !IN_ACCOUNT.has(n.to));
export const ACCOUNT_LINKS = [
  { to: '/student/profile', label: 'Profile', icon: UserRound },
  ...NAV.filter(n => n.to === '/student/badges'),
  { to: '/student/settings', label: 'Settings', icon: Settings },
  ...NAV.filter(n => n.to === '/student/help'),
];

export const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('') || '?';

const row = 'sky-nav flex h-10 w-full items-center gap-4 rounded-full px-3 text-base transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'; // inset: the scrolling nav clips outer rings
// Labels stay in the DOM (screen readers) and only fade in while the rail is open. Hover opens it only on hover-capable
// devices, so a tap on a wide touch screen (iPad landscape) can't leave it stuck open.
const label = 'whitespace-nowrap opacity-0 transition-opacity duration-200 motion-reduce:transition-none [@media(hover:hover)]:group-hover/rail:opacity-100 group-has-[:focus-visible]/rail:opacity-100 group-data-[menu=open]/rail:opacity-100';

/** The student's name at the foot of the rail; hovering it (or a click or Enter) opens the account menu. */
function AccountMenu({ open, setOpen }: { open: boolean; setOpen: (o: boolean) => void }) {
  const { name, signOut } = useCenter();
  const { resolvedTheme, setTheme } = useTheme();
  const shut = useRef<ReturnType<typeof setTimeout>>();
  // Opened by hover, closing must not hand focus back to the name: a focused name keeps the rail open (has-[:focus-visible]).
  const byHover = useRef(false);
  // Moving from the name into the menu crosses a small gap, so closing waits a moment and any re-entry cancels it.
  const enter = (e: PointerEvent) => { if (e.pointerType === 'mouse') { clearTimeout(shut.current); if (!open) byHover.current = true; setOpen(true); } };
  const leave = (e: PointerEvent) => { if (e.pointerType === 'mouse') shut.current = setTimeout(() => setOpen(false), 150); };
  const dark = resolvedTheme === 'dark';
  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Account menu for ${name}`} onPointerEnter={enter} onPointerLeave={leave}
          // A click after hover would toggle it shut; keep it open instead.
          onPointerDown={e => { if (e.pointerType === 'mouse' && open) e.preventDefault(); }}
          onKeyDown={() => { byHover.current = false; }}
          className="sky-nav flex h-10 w-full items-center gap-3 rounded-full px-1 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-full sky-avatar !text-xs font-semibold">{initials(name)}</span>
          <span className={`min-w-0 truncate font-medium ${label}`}>{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end" sideOffset={12} className="w-52" onPointerEnter={enter} onPointerLeave={leave}
        onCloseAutoFocus={e => { if (byHover.current) e.preventDefault(); byHover.current = false; }}>
        <DropdownMenuLabel className="truncate">{name}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACCOUNT_LINKS.map(({ to, label: text, icon: Icon }) => (
          <DropdownMenuItem key={to} asChild><NavLink to={to}><Icon className="h-4 w-4 mr-2" />{text}</NavLink></DropdownMenuItem>
        ))}
        <DropdownMenuCheckboxItem className="pl-2 [&>span:first-child]:hidden" checked={dark} onCheckedChange={c => setTheme(c ? 'dark' : 'light')} onSelect={e => e.preventDefault()}>
          <Moon className="h-4 w-4 mr-2" />Dark mode<Switch className="ml-auto pointer-events-none" tabIndex={-1} checked={dark} aria-hidden />
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive dark:text-red-400 dark:focus:text-red-400" onSelect={signOut}><LogOut className="h-4 w-4 mr-2" />Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Desktop sidebar: icons only at rest, opens over the page on hover or keyboard focus. */
export function StudentRail() {
  const { center } = useCenter();
  // The menu sits outside the rail, so the rail stays open while it is open; otherwise it would collapse under the pointer.
  const [menu, setMenu] = useState(false);
  const link = ({ isActive }: { isActive: boolean }) => `${row} ${isActive ? 'font-medium' : ''}`;
  return (
    <aside data-menu={menu ? 'open' : undefined} className="group/rail hidden lg:flex fixed left-4 top-4 bottom-4 z-40 w-16 [@media(hover:hover)]:hover:w-60 has-[:focus-visible]:w-60 data-[menu=open]:w-60 flex-col overflow-hidden sky-sidebar p-3 transition-[width] duration-300 motion-reduce:transition-none">
      <div className="flex items-center gap-3 pt-1 pb-4">
        <CenterLogo center={center} className="h-10 w-10 shrink-0 sky-avatar" />
        <p className={`min-w-0 truncate font-semibold ${label}`}>{centerDisplayName(center)}</p>
      </div>
      <nav aria-label="Student" className="flex-1 space-y-2 overflow-y-auto scrollbar-hide">
        {RAIL_NAV.map(({ to, label: text, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={link}><Icon className="h-4 w-4 shrink-0" /><span className={label}>{text}</span></NavLink>
        ))}
      </nav>
      <div className="mx-2 my-2 h-px bg-border/60" />
      <AccountMenu open={menu} setOpen={setMenu} />
    </aside>
  );
}
