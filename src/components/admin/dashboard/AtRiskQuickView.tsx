import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, ChevronRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AtRiskStudent {
  id: string;
  name: string;
  daysInactive: number;
  riskScore: number;
  phone: string;
}

interface AtRiskQuickViewProps {
  students: AtRiskStudent[];
}

function getRiskBadgeStyle(riskScore: number): string {
  if (riskScore >= 80) return 'bg-status-risk/20 text-status-risk border-status-risk/30';
  if (riskScore >= 50) return 'bg-status-watch/20 text-status-watch border-status-watch/30';
  return 'bg-status-watch/20 text-status-watch border-status-watch/30';
}

function getRiskLabel(riskScore: number): string {
  if (riskScore >= 80) return 'Critical';
  if (riskScore >= 50) return 'High';
  return 'Medium';
}

export function AtRiskQuickView({ students }: AtRiskQuickViewProps) {
  const navigate = useNavigate();

  return (
    <section className="min-w-0 border-t py-5">
      <div className="pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-status-risk" />
            At-Risk Students
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/admin/analytics')}
          >
            View all
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
      <div>
        {students.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-status-healthy font-medium">All students active!</p>
            <p className="text-xs text-muted-foreground mt-1">No at-risk students detected</p>
          </div>
        ) : (
          <div className="space-y-2">
            {students.map((student) => (
              <div 
                key={student.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                onClick={() => navigate(`/admin/student/${student.id}`)}
              >
                {/* Name */}
                <span className="flex-1 text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {student.name}
                </span>
                
                {/* Days inactive */}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs font-mono tabular-nums">
                    {student.daysInactive}d
                  </span>
                </div>
                
                {/* Risk badge */}
                <Badge 
                  variant="outline" 
                  className={`text-[10px] font-mono ${getRiskBadgeStyle(student.riskScore)}`}
                >
                  {getRiskLabel(student.riskScore)}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
