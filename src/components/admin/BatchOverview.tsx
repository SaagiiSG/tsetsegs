import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  LayoutGrid, 
  List, 
  Users, 
  GraduationCap, 
  AlertTriangle,
  TrendingUp,
  Calendar,
  Filter,
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

export function BatchOverview() {
  const [batches, setBatches] = useState<BatchStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [teacherFilter, setTeacherFilter] = useState<string>('all');
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
      const courseMatch = courseFilter === 'all' || b.course_type === courseFilter;
      const teacherMatch = teacherFilter === 'all' || (b.teacher && b.teacher.toLowerCase().includes(teacherFilter.toLowerCase()));
      return courseMatch && teacherMatch;
    });
  }, [batches, courseFilter, teacherFilter]);

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

      // Fetch all batches
      const { data: batchesData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .order('start_date', { ascending: false });

      if (batchError) throw batchError;

      // Process each batch
      const batchStats: BatchStats[] = await Promise.all(
        (batchesData || []).map(async (batch) => {
          // Get students for this batch
          const { data: students } = await supabase
            .from('students')
            .select('id')
            .eq('batch_id', batch.id);

          const studentIds = students?.map(s => s.id) || [];
          const studentCount = studentIds.length;

          // Get attendance records
          const { data: attendance } = await supabase
            .from('attendance')
            .select('*')
            .eq('batch_id', batch.id);

          // Get homework records
          const { data: homework } = await supabase
            .from('homework')
            .select('student_id, completed')
            .eq('batch_id', batch.id);

          // Calculate attendance rate and alerts
          let totalPresent = 0;
          let totalSessions = 0;
          const maxSessions = batch.course_type === 'IELTS' ? 24 : 15;

          // Track per-student absence counts
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

          // Track per-student homework miss counts
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

          // Count students with 3+ absences OR 3+ homework misses
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

  const getAttendanceBadge = (rate: number) => {
    if (rate >= 90) return <Badge className="bg-green-600">Excellent</Badge>;
    if (rate >= 75) return <Badge className="bg-blue-600">Good</Badge>;
    if (rate >= 60) return <Badge className="bg-yellow-600">Fair</Badge>;
    return <Badge variant="destructive">Needs Attention</Badge>;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Batch Overview</h1>
        <p className="text-muted-foreground">Monitor all batches at a glance</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.total}</p>
              <p className="text-sm text-muted-foreground">Total Batches</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-500/10">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.totalStudents}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-500/10">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.avgAttendance.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Avg Attendance</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-red-500/10">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summaryStats.totalAlerts}</p>
              <p className="text-sm text-muted-foreground">Students at Risk</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Course Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              <SelectItem value="SAT">SAT</SelectItem>
              <SelectItem value="IELTS">IELTS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={teacherFilter} onValueChange={setTeacherFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teachers</SelectItem>
              {teachers.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Batch List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map(batch => (
            <Card 
              key={batch.id} 
              className="hover:shadow-md transition-all cursor-pointer hover:border-primary/50 group"
              onClick={() => navigate(`/admin/batches?batch=${batch.id}`)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
                      {batch.batch_name || 'Unnamed Batch'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">{batch.teacher || 'No teacher'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={batch.course_type === 'SAT' ? 'default' : 'secondary'}>
                      {batch.course_type}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(batch.start_date), 'MMM d, yyyy')}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="text-lg font-semibold">{batch.studentCount}</p>
                    <p className="text-xs text-muted-foreground">Students</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className="text-lg font-semibold">{batch.attendanceRate.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">Attendance</p>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <p className={`text-lg font-semibold ${batch.alertCount > 0 ? 'text-red-500' : ''}`}>
                      {batch.alertCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Alerts</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  {getAttendanceBadge(batch.attendanceRate)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead className="text-center">Students</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead className="text-center">Alerts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map(batch => (
                    <TableRow 
                      key={batch.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/batches?batch=${batch.id}`)}
                    >
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {batch.batch_name || 'Unnamed Batch'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={batch.course_type === 'SAT' ? 'default' : 'secondary'}>
                          {batch.course_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {batch.teacher || '-'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(batch.start_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-center">{batch.studentCount}</TableCell>
                      <TableCell className="text-center">{batch.attendanceRate.toFixed(1)}%</TableCell>
                      <TableCell className="text-center">
                        {batch.alertCount > 0 ? (
                          <span className="text-red-500 font-medium">{batch.alertCount}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>{getAttendanceBadge(batch.attendanceRate)}</TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredBatches.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No batches found with selected filters</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
