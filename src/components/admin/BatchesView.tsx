import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BatchCard } from './BatchCard';

export function BatchesView() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedIntake, setSelectedIntake] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    const { data } = await supabase
      .from('batches')
      .select(`
        *,
        students (*)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setBatches(data);
    }
  };

  // Get unique intakes (Month Year from start_date)
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

  // Get unique teachers
  const teachers = useMemo(() => {
    const teacherSet = new Set<string>();
    batches.forEach((batch) => {
      if (batch.teacher) {
        teacherSet.add(batch.teacher);
      }
    });
    return Array.from(teacherSet).sort();
  }, [batches]);

  // Filter batches
  const filteredBatches = useMemo(() => {
    return batches.filter((batch) => {
      // Filter by intake
      if (selectedIntake !== 'all') {
        const batchDate = new Date(batch.start_date);
        const batchIntake = batchDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        if (batchIntake !== selectedIntake) return false;
      }

      // Filter by teacher
      if (selectedTeacher !== 'all' && batch.teacher !== selectedTeacher) {
        return false;
      }

      return true;
    });
  }, [batches, selectedIntake, selectedTeacher]);

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

      {/* Batch List */}
      <Card>
        <CardHeader>
          <CardTitle>All Batches</CardTitle>
          <CardDescription>
            Showing {filteredBatches.length} of {batches.length} batch{batches.length !== 1 ? 'es' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filteredBatches.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {batches.length === 0
                ? 'No batches created yet. Create your first batch to get started!'
                : 'No batches match your filters.'}
            </p>
          ) : (
            filteredBatches.map((batch) => (
              <BatchCard key={batch.id} batch={batch} onUpdate={fetchBatches} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
