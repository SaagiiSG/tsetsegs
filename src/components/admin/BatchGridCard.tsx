import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, Clock } from 'lucide-react';

interface BatchGridCardProps {
  batch: any;
  studentCount: number;
  onClick: () => void;
}

// Convert full schedule to short format like "4:40 Mon/Wed/Fri"
const formatShortSchedule = (schedule: string): string => {
  if (!schedule) return '';
  
  // Extract time (first occurrence of HH:MM pattern)
  const timeMatch = schedule.match(/(\d{1,2}):(\d{2})/);
  const time = timeMatch ? `${parseInt(timeMatch[1])}:${timeMatch[2]}` : '';
  
  // Map Mongolian days to short English
  const dayMap: Record<string, string> = {
    'Даваа': 'Mon',
    'Мягмар': 'Tue', 
    'Лхагва': 'Wed',
    'Пүрэв': 'Thu',
    'Баасан': 'Fri',
    'Бямба': 'Sat',
    'Ням': 'Sun',
  };
  
  const days: string[] = [];
  
  // Check for day patterns
  if (schedule.includes('Даваа') && schedule.includes('Лхагва') && schedule.includes('Баасан')) {
    days.push('MWF');
  } else if (schedule.includes('Мягмар') && schedule.includes('Пүрэв')) {
    days.push('TT');
  } else if (schedule.includes('Даваа') && schedule.includes('Пүрэв')) {
    days.push('M-Th');
  } else {
    // Individual days
    Object.entries(dayMap).forEach(([mn, en]) => {
      if (schedule.includes(mn)) days.push(en);
    });
  }
  
  // Check for Saturday add-on
  if (schedule.includes('Бямба') && !days.includes('Sat') && days.length > 0) {
    return `${time} ${days[0]}+Sat`;
  }
  
  return `${time} ${days.join('/')}`;
};

export function BatchGridCard({ batch, studentCount, onClick }: BatchGridCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const shortSchedule = formatShortSchedule(batch.schedule);

  return (
    <Card 
      className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 hover:border-primary/50"
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Course Badge & Schedule */}
        <div className="flex items-center justify-between gap-2">
          <Badge 
            className="font-semibold" 
            style={{ 
              backgroundColor: batch.course_type === 'SAT' ? 'hsl(217, 91%, 60%)' : 'hsl(271, 91%, 65%)',
              color: 'white'
            }}
          >
            {batch.course_type}
          </Badge>
          {shortSchedule && (
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {shortSchedule}
            </span>
          )}
        </div>

        {/* Batch Name */}
        <h3 className="font-semibold text-base line-clamp-2 min-h-[2.5rem]">
          {batch.batch_name || `${batch.teacher} - ${formatDate(batch.start_date)}`}
        </h3>

        {/* Teacher */}
        <p className="text-sm text-muted-foreground truncate">
          {batch.teacher}
        </p>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>{studentCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(batch.start_date)}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
