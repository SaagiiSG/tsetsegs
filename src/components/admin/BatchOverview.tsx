import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  LayoutGrid, 
  List, 
  Users, 
  GraduationCap, 
  AlertTriangle,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';

interface BatchStats {
  id: string;
  batch_name: string | null;
  course_type: 'SAT' | 'IELTS';
  teacher: string | null;
  start_date: string;
  schedule: string;
  studentCount: number;
  attendanceRate: number;
  alertCount: number;
}

const ITEMS_PER_PAGE = 9;

export function BatchOverview() {
  const [batches, setBatches] = useState<BatchStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState<'all' | 'SAT' | 'IELTS'>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get unique teachers for filter
  const teachers = useMemo(() => {
    const teacherSet = new Set<string>();
    batches.forEach(b => {
      if (b.teacher) {
        b.teacher.split(',').forEach(t => teacherSet.add(t.trim()));
      }
    });
    return Array.from(teacherSet).sort();
  }, [batches]);

  // Filter batches
  const filteredBatches = useMemo(() => {
    return batches.filter(b => {
      const matchesCourse = courseFilter === 'all' || b.course_type === courseFilter;
      const matchesTeacher = teacherFilter === 'all' || 
        (b.teacher && b.teacher.toLowerCase().includes(teacherFilter.toLowerCase()));
      const matchesSearch = searchQuery.length < 2 || 
        b.batch_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.teacher?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCourse && matchesTeacher && matchesSearch;
    });
  }, [batches, courseFilter, teacherFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredBatches.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBatches = filteredBatches.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [courseFilter, teacherFilter, searchQuery]);

  // Summary stats
  const summaryStats = useMemo(() => {
    const total = filteredBatches.length;
    const totalStudents = filteredBatches.reduce((sum, b) => sum + b.studentCount, 0);
    const avgAttendance = total > 0 
      ? filteredBatches.reduce((sum, b) => sum + b.attendanceRate, 0) / total 
      : 0;
    const totalAlerts = filteredBatches.reduce((sum, b) => sum + b.alertCount, 0);
    return { total, totalStudents, avgAttendance, totalAlerts };
  }, [filteredBatches]);

  useEffect(() => {
    fetchBatchStats();
  }, []);

  const fetchBatchStats = async () => {
    try {
      setIsLoading(true);

      const { data: batchesData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .order('start_date', { ascending: false });

      if (batchError) throw batchError;

      const batchStats: BatchStats[] = await Promise.all(
        (batchesData || []).map(async (batch) => {
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .eq('batch_id', batch.id);

          const studentIds = students?.map(s => s.id) || [];
          const studentCount = studentIds.length;

          const { data: attendance } = await supabase
            .from('attendance')
            .select('*')
            .eq('batch_id', batch.id);

          const { data: homework } = await supabase
            .from('homework')
            .select('student_id, completed')
            .eq('batch_id', batch.id);

          let totalPresent = 0;
          let totalSessions = 0;
          const maxSessions = batch.course_type === 'IELTS' ? 24 : 15;

          const studentAbsenceCounts: Record<string, number> = {};

          attendance?.forEach(record => {
            const studentId = record.student_id as string;
            if (!studentAbsenceCounts[studentId]) {
              studentAbsenceCounts[studentId] = 0;
            }
            
            for (let i = 1; i <= maxSessions; i++) {
              const sessionKey = `session_${i}` as keyof typeof record;
              const status = record[sessionKey];
              if (status) {
                totalSessions++;
                if (status === 'present' || status === 'late') {
                  totalPresent++;
                } else if (status === 'absent') {
                  studentAbsenceCounts[studentId]++;
                }
              }
            }
          });

          const studentHomeworkMissCounts: Record<string, number> = {};
          homework?.forEach(record => {
            const studentId = record.student_id;
            if (!studentHomeworkMissCounts[studentId]) {
              studentHomeworkMissCounts[studentId] = 0;
            }
            if (!record.completed) {
              studentHomeworkMissCounts[studentId]++;
            }
          });

          const allStudentIds = new Set([
            ...Object.keys(studentAbsenceCounts),
            ...Object.keys(studentHomeworkMissCounts)
          ]);
          
          let alertCount = 0;
          allStudentIds.forEach(studentId => {
            const absences = studentAbsenceCounts[studentId] || 0;
            const homeworkMisses = studentHomeworkMissCounts[studentId] || 0;
            if (absences >= 3 || homeworkMisses >= 3) {
              alertCount++;
            }
          });

          const attendanceRate = totalSessions > 0 ? (totalPresent / totalSessions) * 100 : 0;

          return {
            id: batch.id,
            batch_name: batch.batch_name,
            course_type: batch.course_type,
            teacher: batch.teacher,
            start_date: batch.start_date,
            schedule: batch.schedule,
            studentCount,
            attendanceRate,
            alertCount,
          };
        })
      );

      setBatches(batchStats);
    } catch (error) {
      console.error('Error fetching batch stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load batch statistics',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 90) return 'text-emerald-600';
    if (rate >= 75) return 'text-blue-600';
    if (rate >= 60) return 'text-amber-600';
    return 'text-destructive';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="space-y-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="border-none bg-muted/30">
              <CardContent className="p-5">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Control island skeleton */}
        <Skeleton className="h-28 w-full rounded-xl" />
        
        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Class Overview</h1>
        <p className="text-muted-foreground">Monitor all active batches at a glance</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Batches</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.totalStudents}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-gradient-to-br from-emerald-500/5 to-emerald-500/10">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.avgAttendance.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Avg Attendance</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-gradient-to-br from-destructive/5 to-destructive/10">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.totalAlerts}</p>
              <p className="text-sm text-muted-foreground">At Risk</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Island */}
      <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-4 space-y-4">
        {/* Top row: Filters + Search */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Course type pills */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
            {(['all', 'SAT', 'IELTS'] as const).map(type => (
              <button
                key={type}
                onClick={() => setCourseFilter(type)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                  courseFilter === type 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {type === 'all' ? 'All Classes' : type}
              </button>
            ))}
          </div>
          
          {/* Search + Teacher + View toggle */}
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-background/50"
              />
            </div>
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger className="w-[140px] h-9 bg-background/50">
                <SelectValue placeholder="Teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teachers</SelectItem>
                {teachers.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-0.5 border rounded-lg p-0.5 bg-background/50">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('table')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Bottom row: Count + Pagination */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {filteredBatches.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredBatches.length)} of {filteredBatches.length} batches
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 text-sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Batch Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedBatches.map((batch, idx) => {
            // Parse schedule for display (e.g., "Mon, Wed, Fri | 4:40")
            const scheduleDisplay = batch.schedule || '';
            const startDate = new Date(batch.start_date);
            const monthYear = format(startDate, 'MMM | yyyy');
            
            // Calculate course progress (only show if > 0)
            const showProgress = batch.attendanceRate > 0;
            
            return (
              <Card 
                key={batch.id}
                className={cn(
                  "group relative overflow-hidden transition-all duration-300 cursor-pointer",
                  "hover:shadow-lg hover:-translate-y-1",
                  "border-l-4",
                  batch.course_type === 'SAT' ? "border-l-blue-500" : "border-l-purple-500",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
                onClick={() => navigate(`/admin/analytics/${batch.id}`)}
              >
                <CardContent className="p-5 space-y-3">
                  {/* Header: Month | Year */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <h3 className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
                        {monthYear}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        {scheduleDisplay}
                      </p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "shrink-0",
                        batch.course_type === 'SAT' 
                          ? "border-blue-500/50 text-blue-600 bg-blue-500/5" 
                          : "border-purple-500/50 text-purple-600 bg-purple-500/5"
                      )}
                    >
                      {batch.course_type}
                    </Badge>
                  </div>
                  
                  {/* Teacher */}
                  <p className="text-sm text-foreground">
                    {batch.teacher || 'No teacher assigned'}
                  </p>
                  
                  {/* Course Progress (only if started) */}
                  {showProgress && (
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Course Progress</span>
                        <span className={cn("font-medium", getAttendanceColor(batch.attendanceRate))}>
                          {batch.attendanceRate.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={batch.attendanceRate} className="h-1.5" />
                    </div>
                  )}
                  
                  {/* Footer Stats */}
                  <div className="flex items-center justify-between pt-3 border-t text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{batch.studentCount} students</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {batch.alertCount > 0 && (
                        <div className="flex items-center gap-1 text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{batch.alertCount}</span>
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Started {format(startDate, 'MMM d')}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-semibold">Batch Name</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-center">Alerts</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedBatches.map(batch => (
                  <TableRow 
                    key={batch.id} 
                    className="cursor-pointer group"
                    onClick={() => navigate(`/admin/analytics/${batch.id}`)}
                  >
                    <TableCell className="font-medium max-w-[200px]">
                      <span className="truncate block group-hover:text-primary transition-colors">
                        {batch.batch_name || 'Unnamed Batch'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          batch.course_type === 'SAT' 
                            ? "border-blue-500/50 text-blue-600 bg-blue-500/5" 
                            : "border-purple-500/50 text-purple-600 bg-purple-500/5"
                        )}
                      >
                        {batch.course_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-muted-foreground">
                      {batch.teacher || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(batch.start_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-center">{batch.studentCount}</TableCell>
                    <TableCell className="text-center">
                      <span className={getAttendanceColor(batch.attendanceRate)}>
                        {batch.attendanceRate.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {batch.alertCount > 0 ? (
                        <span className="text-destructive font-medium">{batch.alertCount}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {filteredBatches.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <GraduationCap className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium mb-1">No batches found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters or search query
            </p>
          </CardContent>
        </Card>
      )}

      {/* Bottom Pagination (for grid view) */}
      {viewMode === 'grid' && totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="px-4 text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
