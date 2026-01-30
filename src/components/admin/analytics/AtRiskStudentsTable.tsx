import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, MessageSquare, BookOpen, User, Info } from 'lucide-react';
import { useAtRiskStudents } from '@/hooks/useAdminAnalytics';
import { formatDistanceToNow } from 'date-fns';

export function AtRiskStudentsTable() {
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('all');
  
  const { data: students, isLoading } = useAtRiskStudents();

  const getRiskBadge = (score: number) => {
    if (score >= 70) {
      return <Badge variant="destructive">High ({score})</Badge>;
    }
    if (score >= 40) {
      return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Medium ({score})</Badge>;
    }
    return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Low ({score})</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle>At-Risk Students</CardTitle>
              <CardDescription>
                Students requiring attention based on engagement metrics
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Info className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="font-semibold mb-1">Risk Score Calculation:</p>
                <ul className="text-xs space-y-1">
                  <li>• Login recency: 30%</li>
                  <li>• Accuracy trend: 25%</li>
                  <li>• Practice frequency: 20%</li>
                  <li>• Topic avoidance: 15%</li>
                  <li>• Sprint engagement: 10%</li>
                </ul>
              </TooltipContent>
            </Tooltip>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                <SelectItem value="jan2025">January 2025</SelectItem>
                <SelectItem value="dec2024">December 2024</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !students || students.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No at-risk students found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="hidden md:table-cell">Risk Factors</TableHead>
                <TableHead className="hidden sm:table-cell">Last Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.slice(0, 10).map((student) => (
                <TableRow key={student.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                        {student.initials}
                      </div>
                      <span className="font-medium">{student.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{student.batchName}</Badge>
                  </TableCell>
                  <TableCell>{getRiskBadge(student.riskScore)}</TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground text-sm">
                    {student.riskFactors}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                    {student.lastActive ? formatDistanceToNow(new Date(student.lastActive), { addSuffix: true }) : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <BookOpen className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <User className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
