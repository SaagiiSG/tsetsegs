import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  if (riskScore >= 80) return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  if (riskScore >= 50) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
}

function getRiskLabel(riskScore: number): string {
  if (riskScore >= 80) return 'Critical';
  if (riskScore >= 50) return 'High';
  return 'Medium';
}

export function AtRiskQuickView({ students }: AtRiskQuickViewProps) {
  const navigate = useNavigate();

  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50 animate-fade-in" style={{ animationDelay: '350ms' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            At-Risk Students
          </CardTitle>
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
      </CardHeader>
      <CardContent>
        {students.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-emerald-400 font-medium">All students active!</p>
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
      </CardContent>
    </Card>
  );
}
