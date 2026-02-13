import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Copy, ExternalLink, RefreshCw, MessageSquare, Trash2, Users } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TimeSlot {
  day: string;
  start_time: string;
  end_time: string;
}

const DAY_SHORT: Record<string, string> = {
  'monday': 'Mon', 'tuesday': 'Tue', 'wednesday': 'Wed',
  'thursday': 'Thu', 'friday': 'Fri', 'saturday': 'Sat', 'sunday': 'Sun',
};

const formatNewSchedule = (schedule: TimeSlot[]): string => {
  if (!schedule || schedule.length === 0) return '';
  const days = [...new Set(schedule.map(s => DAY_SHORT[s.day] || s.day))];
  const firstTime = schedule[0]?.start_time?.replace(/^0/, '') || '';
  return `${firstTime} ${days.join('/')}`;
};

const formatShortSchedule = (schedule: string, mathSchedule?: TimeSlot[]): string => {
  if (mathSchedule && mathSchedule.length > 0) {
    return formatNewSchedule(mathSchedule);
  }
  if (!schedule) return '';
  const timeMatch = schedule.match(/(\d{1,2}):(\d{2})/);
  const time = timeMatch ? `${parseInt(timeMatch[1])}:${timeMatch[2]}` : '';
  const dayMap: Record<string, string> = {
    'Даваа': 'Mon', 'Мягмар': 'Tue', 'Лхагва': 'Wed',
    'Пүрэв': 'Thu', 'Баасан': 'Fri', 'Бямба': 'Sat', 'Ням': 'Sun',
  };
  const days: string[] = [];
  if (schedule.includes('Даваа') && schedule.includes('Лхагва') && schedule.includes('Баасан')) {
    days.push('MWF');
  } else if (schedule.includes('Мягмар') && schedule.includes('Пүрэв')) {
    days.push('TT');
  } else if (schedule.includes('Даваа') && schedule.includes('Пүрэв')) {
    days.push('M-Th');
  } else {
    Object.entries(dayMap).forEach(([mn, en]) => {
      if (schedule.includes(mn)) days.push(en);
    });
  }
  if (schedule.includes('Бямба') && !days.includes('Sat') && days.length > 0) {
    return `${time} ${days[0]}+Sat`;
  }
  return `${time} ${days.join('/')}`;
};

interface BatchListRowProps {
  batch: any;
  studentCount: number;
  onEdit: () => void;
  onCopyLink: () => void;
  onOpenLink: () => void;
  onRegenerateLink: () => void;
  onCopySms: () => void;
  onDelete: () => void;
}

export function BatchListRow({
  batch,
  studentCount,
  onEdit,
  onCopyLink,
  onOpenLink,
  onRegenerateLink,
  onCopySms,
  onDelete,
}: BatchListRowProps) {
  const mathSchedule = batch.math_schedule as TimeSlot[] | null;
  const shortSchedule = formatShortSchedule(batch.schedule, mathSchedule || undefined);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 rounded-lg transition-colors group">
      {/* Course badge */}
      <Badge
        className="font-semibold text-xs shrink-0 w-12 justify-center"
        style={{
          backgroundColor: batch.course_type === 'SAT' ? 'hsl(217, 91%, 60%)' : 'hsl(271, 91%, 65%)',
          color: 'white',
        }}
      >
        {batch.course_type}
      </Badge>

      {/* Teacher */}
      <span className="text-sm font-medium truncate min-w-[100px] max-w-[160px]">
        {batch.teacher || '—'}
      </span>

      {/* Schedule */}
      <span className="text-sm text-muted-foreground truncate min-w-[120px] max-w-[180px]">
        {shortSchedule || '—'}
      </span>

      {/* Start date */}
      <span className="text-sm text-muted-foreground shrink-0 w-[60px]">
        {formatDate(batch.start_date)}
      </span>

      {/* Student count */}
      <span className="text-sm text-muted-foreground shrink-0 flex items-center gap-1">
        <Users className="w-3.5 h-3.5" />
        {studentCount}
      </span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* 3-dot menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="z-50 bg-popover">
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Batch
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCopyLink}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenLink}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Link
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRegenerateLink}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Regenerate Link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onCopySms}>
            <MessageSquare className="w-4 h-4 mr-2" />
            Copy SMS Template
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Batch
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}