import { NavLink } from '@/components/NavLink';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { 
  BookOpen, Zap, Brain, BarChart3, Trophy, Settings, LogOut, User, Languages, Sparkles, BookMarked, Armchair
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/practice/dashboard', icon: BookOpen, label: 'Practice' },
  { to: '/practice/smart', icon: Sparkles, label: 'Smart Practice' },
  { to: '/practice/reading', icon: BookMarked, label: 'Reading' },
  { to: '/practice/speed', icon: Zap, label: 'Speed Mode' },
  { to: '/practice/review', icon: Brain, label: 'Review' },
  { to: '/practice/vocabulary', icon: Languages, label: 'Vocabulary' },
  { to: '/practice/stats', icon: BarChart3, label: 'Stats' },
  { to: '/practice/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/practice/booking', icon: Armchair, label: 'Book Seat' },
  { to: '/practice/settings', icon: Settings, label: 'Settings' },
];

export function StudentSidebar() {
  const { student, logout } = useStudentAuth();

  const studentName = student?.linked_student 
    ? `${student.linked_student.first_name}${student.linked_student.last_name ? ' ' + student.linked_student.last_name.charAt(0) + '.' : ''}`
    : student?.phone_number || 'Student';

  return (
    <aside className="hidden md:flex flex-col w-64 bg-card border-r h-screen sticky top-0">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{studentName}</h2>
            <p className="text-xs text-muted-foreground">SAT Practice</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
            activeClassName="bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
