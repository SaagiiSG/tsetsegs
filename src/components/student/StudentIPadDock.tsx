import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, BookOpen, Zap, Trophy, Swords, MoreHorizontal,
  FileText, Brain, Armchair, Languages, BarChart3, Flag,
  User, Settings, LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { CourseSwitcher } from './CourseSwitcher';

interface DockItem {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}

const primaryItems: DockItem[] = [
  { to: '/practice/home', icon: Home, label: 'Dashboard', end: true },
  { to: '/practice/dashboard', icon: BookOpen, label: 'Practice' },
  { to: '/practice/speed', icon: Zap, label: 'Speed' },
  { to: '/practice/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/practice/challenges', icon: Swords, label: 'Challenges' },
];

const moreGroups: { label: string; items: DockItem[] }[] = [
  {
    label: 'Learning',
    items: [
      { to: '/practice/bluebook', icon: FileText, label: 'Practice Tests' },
      { to: '/practice/review', icon: Brain, label: 'Review' },
    ],
  },
  {
    label: 'Tools',
    items: [
      { to: '/practice/booking', icon: Armchair, label: 'Book Seat' },
      { to: '/practice/vocabulary', icon: Languages, label: 'Vocabulary' },
      { to: '/practice/stats', icon: BarChart3, label: 'Statistics' },
      { to: '/practice/my-flags', icon: Flag, label: 'My Flags' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/practice/profile', icon: User, label: 'Profile' },
      { to: '/practice/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

function isActivePath(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(to + '/');
}

function DockButton({ item }: { item: DockItem }) {
  const { pathname } = useLocation();
  const active = isActivePath(pathname, item.to, item.end);
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      draggable={false}
      className={cn(
        'group relative flex items-center justify-center w-12 h-12 rounded-2xl transition-colors',
        active
          ? 'bg-primary/15 text-primary shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)]'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
      )}
      aria-label={item.label}
      title={item.label}
    >
      <motion.div whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.12, y: -2 }}>
        <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.4 : 2} />
      </motion.div>
    </NavLink>
  );
}

export function StudentIPadDock() {
  const [moreOpen, setMoreOpen] = useState(false);
  const { logout } = useStudentAuth();

  return (
    <div
      className="hidden md:flex xl:hidden fixed inset-x-0 bottom-4 z-40 justify-center pointer-events-none"
      aria-label="Primary navigation container"
    >
      <motion.nav
        initial={{ y: 60, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24, delay: 0.15 }}
        drag
        dragMomentum={false}
        dragElastic={0.18}
        dragTransition={{ bounceStiffness: 320, bounceDamping: 22 }}
        dragConstraints={{ top: -600, bottom: 16, left: -320, right: 320 }}
        whileDrag={{ scale: 1.04, cursor: 'grabbing' }}
        className="pointer-events-auto touch-none cursor-grab active:cursor-grabbing select-none"
        aria-label="Primary navigation"
      >
        <div className="flex items-center gap-1 px-2 py-2 rounded-[28px] bg-card/80 backdrop-blur-xl border border-border/60 shadow-2xl">
          {primaryItems.map((item) => (
            <DockButton key={item.to} item={item} />
          ))}

          <div className="w-px h-7 bg-border/70 mx-1" />

          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-2xl transition-colors',
                  moreOpen
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
                aria-label="More navigation"
                title="More"
              >
                <motion.div whileTap={{ scale: 0.85 }} whileHover={{ scale: 1.12, y: -2 }}>
                  <MoreHorizontal className="h-[22px] w-[22px]" />
                </motion.div>
              </button>
            </SheetTrigger>

          <SheetContent side="bottom" className="rounded-t-3xl max-h-[80vh] overflow-y-auto">
            <SheetHeader className="text-left">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>

            <div className="mt-4 space-y-6 pb-6">
              {moreGroups.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          end={item.end}
                          onClick={() => setMoreOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              'flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border transition-all',
                              isActive
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-muted/30 text-foreground border-border/60 hover:bg-muted/60'
                            )
                          }
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-xs font-medium">{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t space-y-2">
                <CourseSwitcher current="SAT" className="w-full justify-start" />
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </motion.nav>
  );
}
