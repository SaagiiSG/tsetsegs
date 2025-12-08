import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BatchGridCard } from './BatchGridCard';
import { BatchDetailsDialog } from './BatchDetailsDialog';

export function BatchesView() {
  const [batches, setBatches] = useState<any[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [selectedIntake, setSelectedIntake] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (batches.length > 0) {
      fetchStudentCounts();
    }
  }, [batches]);

  const fetchBatches = async () => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const { data } = await supabase
      .from('batches')
      .select('*')
      .gte('start_date', currentMonthStart.toISOString())
      .order('start_date', { ascending: false });

    if (data) {
      setBatches(data);
    }
  };

  const fetchStudentCounts = async () => {
    const { data, error } = await supabase.rpc('get_batch_student_counts');
    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((item: { batch_id: string; student_count: number }) => {
        counts[item.batch_id] = item.student_count;
      });
      setStudentCounts(counts);
    }
  };

  const intakes = useMemo(() => {
    const intakeSet = new Set<string>();
    batches.forEach((batch) => {
      if (batch.start_date) {
        const date = new Date(batch.start_date);
        const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        intakeSet.add(monthYear);
      }
    });
    return Array.from(intakeSet).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateB.getTime() - dateA.getTime();
    });
  }, [batches]);

  const teachers = useMemo(() => {
    const teacherSet = new Set<string>();
    batches.forEach((batch) => {
      if (batch.teacher) {
        teacherSet.add(batch.teacher);
      }
    });
    return Array.from(teacherSet).sort();
  }, [batches]);

  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      if (selectedIntake !== 'all') {
        const batchDate = new Date(batch.start_date);
        const batchIntake = batchDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (batchIntake !== selectedIntake) return false;
      }

      if (selectedTeacher !== 'all' && batch.teacher !== selectedTeacher) {
        return false;
      }

      if (selectedCourse !== 'all' && batch.course_type !== selectedCourse) {
        return false;
      }

      return true;
    });
  }, [batches, selectedIntake, selectedTeacher, selectedCourse]);

  const handleBatchClick = (batch: any) => {
    setSelectedBatch(batch);
    setDialogOpen(true);
  };

  const handleUpdate = () => {
    fetchBatches();
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Batches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  <SelectItem value="SAT">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      SAT
                    </span>
                  </SelectItem>
                  <SelectItem value="IELTS">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      IELTS
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedIntake} onValueChange={setSelectedIntake}>
                <SelectTrigger>
                  <SelectValue placeholder="Select intake" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intakes</SelectItem>
                  {intakes.map((intake) => (
                    <SelectItem key={intake} value={intake}>
                      {intake}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                <SelectTrigger>
                  <SelectValue placeholder="Select teacher" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teachers</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher} value={teacher}>
                      {teacher}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Grid */}
      <Card>
        <CardHeader>
          <CardTitle>All Batches</CardTitle>
          <CardDescription>
            Showing {filteredBatches.length} of {batches.length} batch{batches.length !== 1 ? 'es' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredBatches.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {batches.length === 0
                ? 'No batches created yet. Create your first batch to get started!'
                : 'No batches match your filters.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBatches.map((batch) => (
                <BatchGridCard
                  key={batch.id}
                  batch={batch}
                  studentCount={studentCounts[batch.id] || 0}
                  onClick={() => handleBatchClick(batch)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Details Dialog */}
      <BatchDetailsDialog
        batch={selectedBatch}
        studentCount={selectedBatch ? studentCounts[selectedBatch.id] || 0 : 0}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
