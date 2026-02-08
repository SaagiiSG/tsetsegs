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
    color: 'hover:text-cyan-400 hover:border-cyan-400/50'
  },
  {
    label: 'Search',
    icon: Search,
    path: '/admin/search',
    color: 'hover:text-amber-400 hover:border-amber-400/50'
  },
  {
    label: 'Sprints',
    icon: Trophy,
    path: '/admin/sprint-monitor',
    color: 'hover:text-yellow-400 hover:border-yellow-400/50'
  },
  {
    label: 'Questions',
    icon: BookOpen,
    path: '/admin/questions',
    color: 'hover:text-emerald-400 hover:border-emerald-400/50'
  },
  {
    label: 'Students',
    icon: Users,
    path: '/admin/students',
    color: 'hover:text-purple-400 hover:border-purple-400/50'
  },
  {
    label: 'SAT Schedule',
    icon: Calendar,
    path: '/admin/sat-schedule',
    color: 'hover:text-rose-400 hover:border-rose-400/50'
  }
];

export function QuickActionsBar() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in" style={{ animationDelay: '400ms' }}>
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.path}
              variant="outline"
              size="sm"
              className={`
                flex-shrink-0 gap-2 
                bg-card/50 backdrop-blur-sm border-border/50
                transition-all duration-200
                ${action.color}
              `}
              onClick={() => navigate(action.path)}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
