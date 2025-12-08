import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar } from 'lucide-react';

interface BatchGridCardProps {
  batch: any;
  studentCount: number;
  onClick: () => void;
}

export function BatchGridCard({ batch, studentCount, onClick }: BatchGridCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card 
      className="p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-200 border-2 hover:border-primary/50"
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Course Badge */}
        <Badge 
          className="font-semibold" 
          style={{ 
            backgroundColor: batch.course_type === 'SAT' ? 'hsl(217, 91%, 60%)' : 'hsl(271, 91%, 65%)',
            color: 'white'
          }}
        >
          {batch.course_type}
        </Badge>

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
