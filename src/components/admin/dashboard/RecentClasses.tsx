import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, ChevronRight, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface RecentBatch {
  id: string;
  name: string;
  teacher: string;
  studentCount: number;
  courseType: string;
  startDate: string;
}

interface RecentClassesProps {
  batches: RecentBatch[];
}

export function RecentClasses({ batches }: RecentClassesProps) {
  const navigate = useNavigate();

  return (
    <section className="min-w-0 border-t py-5">
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-muted-foreground" />
            Recent Classes
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/admin/batches')}
          >
            View all
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
      <div>
        {batches.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No classes yet
          </p>
        ) : (
          <div className="space-y-2">
            {batches.map((batch) => (
              <div 
                key={batch.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/admin/analytics/${batch.id}`)}
              >
                {/* Course type badge */}
                <Badge 
                  variant="outline" 
                  className={`text-[10px] font-mono ${
                    batch.courseType === 'SAT' 
                      ? 'bg-status-info/20 text-status-info border-status-info/30' 
                      : 'bg-status-info/20 text-muted-foreground border-status-info/30'
                  }`}
                >
                  {batch.courseType}
                </Badge>
                
                {/* Batch name and teacher */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                    {batch.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {batch.teacher} • {format(new Date(batch.startDate), 'MMM d, yyyy')}
                  </p>
                </div>
                
                {/* Student count */}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-sm font-mono tabular-nums">
                    {batch.studentCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
