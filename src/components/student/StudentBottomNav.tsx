import { NavLink } from '@/components/NavLink';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, BookOpen, Zap, Armchair, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PracticeQuickFab } from './practice/PracticeQuickFab';
import { useLongPress } from '@/hooks/useLongPress';
import { useHaptics } from '@/hooks/useHaptics';
import { usePracticeRecents } from '@/hooks/usePracticeRecents';

interface NavItemDef {
  to: string;
  icon: any;
  label: string;
  /** Long-press destination (defaults to `to`). */
  longTo?: (recents: ReturnType<typeof usePracticeRecents>['recents']) => string;
}

const navItems: NavItemDef[] = [
  { to: '/practice/home', icon: Home, label: 'Home' },
  {
    to: '/practice/dashboard',
    icon: BookOpen,
    label: 'Practice',
    longTo: (r) =>
      r.lastQuestionId ? `/practice/question/${r.lastQuestionId}` : '/practice/dashboard',
  },
  // Center slot replaced by FAB
  { to: '/practice/booking', icon: Armchair, label: 'Book' },
  { to: '/practice/profile', icon: User, label: 'Profile' },
];

const speedItem: NavItemDef = { to: '/practice/speed', icon: Zap, label: 'Speed' };

function NavTab({ item }: { item: NavItemDef }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { recents } = usePracticeRecents();
  const haptics = useHaptics();

  const active = location.pathname === item.to || location.pathname.startsWith(item.to + '/');

  const longPressHandlers = useLongPress({
    ms: 450,
    onLongPress: () => {
      haptics('medium');
      const dest = item.longTo ? item.longTo(recents) : item.to;
      navigate(dest);
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
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[60px]',
        'transition-colors',
        active ? 'text-primary' : 'text-muted-foreground'
      )}
      aria-label={item.label}
    >
      <item.icon className="h-4 w-4" />
      <span className="text-[9px] font-medium">{item.label}</span>
    </button>
  );
}

export function StudentBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-14">
        <NavTab item={navItems[0]} />
        <NavTab item={navItems[1]} />
        {/* Center FAB → Command Sheet */}
        <PracticeQuickFab inline />
        <NavTab item={speedItem} />
        <NavTab item={navItems[3]} />
      </div>
    </nav>
  );
}
