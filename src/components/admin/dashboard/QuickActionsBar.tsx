import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  Search, 
  Trophy, 
  BookOpen, 
  Users,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const actions = [
  {
    label: 'Analytics',
    icon: BarChart3,
    path: '/admin/analytics',
    color: 'hover:text-foreground hover:border-input'
  },
  {
    label: 'Search',
    icon: Search,
    path: '/admin/search',
    color: 'hover:text-foreground hover:border-input'
  },
  {
    label: 'Sprints',
    icon: Trophy,
    path: '/admin/sprint-monitor',
    color: 'hover:text-foreground hover:border-input'
  },
  {
    label: 'Questions',
    icon: BookOpen,
    path: '/admin/questions',
    color: 'hover:text-foreground hover:border-input'
  },
  {
    label: 'Students',
    icon: Users,
    path: '/admin/students',
    color: 'hover:text-foreground hover:border-input'
  },
  {
    label: 'SAT Schedule',
    icon: Calendar,
    path: '/admin/sat-schedule',
    color: 'hover:text-foreground hover:border-input'
  }
];

export function QuickActionsBar() {
  const navigate = useNavigate();

  return (
    <nav aria-label="Dashboard shortcuts">
      <div className="flex flex-wrap items-center gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.path}
              title={action.label}
              variant="outline"
              size="sm"
              className={`
                admin-control flex-shrink-0 gap-2
                bg-card border-border
                ${action.color}
              `}
              onClick={() => navigate(action.path)}
            >
              <Icon className="w-4 h-4" />
              <span>{action.label}</span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
