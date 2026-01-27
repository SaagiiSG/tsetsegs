import { NavLink } from '@/components/NavLink';
import { Home, BookOpen, Zap, Brain, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/practice/home', icon: Home, label: 'Home' },
  { to: '/practice/dashboard', icon: BookOpen, label: 'Practice' },
  { to: '/practice/speed', icon: Zap, label: 'Speed' },
  { to: '/practice/review', icon: Brain, label: 'Review' },
  { to: '/practice/stats', icon: BarChart3, label: 'Stats' },
];

export function StudentBottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px]",
              "text-muted-foreground transition-colors"
            )}
            activeClassName="text-primary"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
