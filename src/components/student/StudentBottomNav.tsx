import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Zap, User, Swords, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLongPress } from '@/hooks/useLongPress';
import { useHaptics } from '@/hooks/useHaptics';
import { usePracticeRecents } from '@/hooks/usePracticeRecents';

interface NavItemDef {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Long-press destination (defaults to `to`). */
  longTo?: (recents: ReturnType<typeof usePracticeRecents>['recents']) => string;
}

// The quick-practice button lives in the header on phones, so the dock keeps five equal tabs.
const navItems: NavItemDef[] = [
  { to: '/practice/home', icon: Home, label: 'Home' },
  {
    to: '/practice/dashboard',
    icon: BookOpen,
    label: 'Practice',
    longTo: (r) =>
      r.lastQuestionId ? `/practice/question/${r.lastQuestionId}` : '/practice/dashboard',
  },
  { to: '/practice/speed', icon: Zap, label: 'Speed' },
  { to: '/practice/challenges', icon: Swords, label: 'Versus' },
  { to: '/practice/profile', icon: User, label: 'Profile' },
];

const isActive = (pathname: string, to: string) => pathname === to || pathname.startsWith(to + '/');

function NavTab({ item, active }: { item: NavItemDef; active: boolean }) {
  const navigate = useNavigate();
  const { recents } = usePracticeRecents();
  const haptics = useHaptics();

  const longPressHandlers = useLongPress({
    ms: 450,
    onLongPress: () => {
      haptics('medium');
      navigate(item.longTo ? item.longTo(recents) : item.to);
    },
    onClick: () => {
      haptics('light');
      navigate(item.to);
    },
  });

  return (
    <button
      type="button"
      {...longPressHandlers}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative z-10 flex h-full flex-1 flex-col items-center justify-center gap-1 rounded-full',
        'transition-[color,transform] duration-150 ease-out active:scale-[0.96]',
        active ? 'text-primary-foreground' : 'text-muted-foreground'
      )}
    >
      <item.icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
      <span className={cn('text-[10px] leading-none', active ? 'font-semibold' : 'font-medium')}>{item.label}</span>
    </button>
  );
}

export function StudentBottomNav() {
  const { pathname } = useLocation();
  const activeIndex = navItems.findIndex((item) => isActive(pathname, item.to));

  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed inset-x-3 z-50 mx-auto max-w-md rounded-full student-dock p-1.5"
      style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      <div className="relative flex h-[52px]">
        {/* One pill slides under the active tab; each step is exactly one tab width. */}
        <span
          aria-hidden
          className={cn(
            'absolute inset-y-0 left-0 w-1/5 rounded-full bg-primary shadow-[0_6px_14px_-6px_hsl(var(--primary)/0.6)]',
            'transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none',
            activeIndex < 0 && 'opacity-0'
          )}
          style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
        />
        {navItems.map((item, i) => (
          <NavTab key={item.to} item={item} active={i === activeIndex} />
        ))}
      </div>
    </nav>
  );
}
