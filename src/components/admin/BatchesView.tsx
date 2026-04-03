import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BatchListRow } from './BatchListRow';
import { BatchDetailsDialog } from './BatchDetailsDialog';
import { useToast } from '@/hooks/use-toast';
import { isOnlineClass } from '@/lib/classUtils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format, parseISO } from 'date-fns';

export function BatchesView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [batches, setBatches] = useState<any[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [selectedIntake, setSelectedIntake] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedBatch, setSelectedBatch] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletingBatch, setDeletingBatch] = useState<any>(null);
  const { toast } = useToast();

  const batchIdFromUrl = searchParams.get('batch');

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (batches.length > 0) {
      fetchStudentCounts();
      if (batchIdFromUrl) {
        const batchToOpen = batches.find(b => b.id === batchIdFromUrl);
        if (batchToOpen) {
          setSelectedBatch(batchToOpen);
          setDialogOpen(true);
        }
        setSearchParams({}, { replace: true });
      }
    }
  }, [batches, batchIdFromUrl]);

  const fetchBatches = async () => {
    const { data } = await supabase
      .from('batches')
      .select('*')
      .order('start_date', { ascending: false });
    if (data) setBatches(data);
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
      if (batch.teacher) teacherSet.add(batch.teacher);
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
      if (selectedTeacher !== 'all' && batch.teacher !== selectedTeacher) return false;
      if (selectedCourse !== 'all' && batch.course_type !== selectedCourse) return false;
      return true;
    });
  }, [batches, selectedIntake, selectedTeacher, selectedCourse]);

  // Group filtered batches by month (MMM yyyy), sorted descending
  const groupedBatches = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredBatches.forEach((batch) => {
      const key = format(parseISO(batch.start_date), 'MMM yyyy');
      if (!groups[key]) groups[key] = [];
      groups[key].push(batch);
    });
    // Sort keys descending by date
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });
    return sortedKeys.map((key) => ({ month: key, batches: groups[key] }));
  }, [filteredBatches]);

  const handleEdit = (batch: any) => {
    setSelectedBatch(batch);
    setDialogOpen(true);
  };

  const handleCopyLink = (batch: any) => {
    const batchLink = `https://flowersos.co/batch/${batch.unique_link_id}`;
    navigator.clipboard.writeText(batchLink);
    toast({ title: "Link Copied", description: "Batch link copied to clipboard" });
  };

  const handleOpenLink = (batch: any) => {
    window.open(`/batch/${batch.unique_link_id}`, '_blank');
  };

  const handleRegenerateLink = async (batch: any) => {
    const newLinkId = Math.random().toString(36).substring(2, 15);
    const { error } = await supabase
      .from('batches')
      .update({ unique_link_id: newLinkId })
      .eq('id', batch.id);
    if (error) {
      toast({ title: "Error", description: "Failed to regenerate link", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Batch link regenerated" });
      fetchBatches();
    }
  };

  const getSmsTemplate = (batch: any) => {
    const batchLink = `https://flowersos.co/batch/${batch.unique_link_id}`;
    if (batch.course_type === 'IELTS') {
      return `Сайн байна уу? \n\nTsetsegs IELTS сургалтаас холбогдож байна. \n\nАнгийн мэдээлэл: ${batchLink}\n\nТус групт\n1. Бидний хэрэглэх ном (Google drive дотор)\n2. Цээжлэх үгс (Google drive дотор)\n3. ЭЕШ-д бэлдэх Англи хэл, Нийгмийн 700+ материал\n4. Сургалтын төлөвлөгөө зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.\n\nБаярлалаа.`;
    }
    if (isOnlineClass(batch.schedule)) {
      return `Сайн байна уу? Таныг бүртгэж авлаа. SAT Math сургалтаас холбогдож байна.\n\n🌐 ONLINE CLASS\n\nClass Info: ${batchLink}\n\nХичээлийн хуваарь:\nMath (Online): Даваа/Лхагва/Баасан 18:40-20:30\nEnglish (үнэгүй): Бямба 18:30-20:00\n\nPlatform: Discord\n\nТус групт 1. Бидний хэрэглэх ном 2. Цээжлэх үгс 3. Шалгалтад бүртгүүлэх заавар 4. 1074 бодлогын сан зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.\n\nТанилцах уулзалтанд тавтай морилно уу!\n\nБаярлалаа.\nУтас: 80660314, 88559876`;
    }
    return `Сайн байна уу? Таныг бүртгэж авлаа. SAT Math сургалтаас холбогдож байна.\n\nClass Info: ${batchLink}\n\nТус групт 1. Бидний хэрэглэх ном 2. Цээжлэх үгс 3. Шалгалтад бүртгүүлэх заавар 4. 1074 бодлогын сан зэрэг байгаа тул эхний postоос эхлэн дуустал нь уншаарай.\n\nТанилцах уулзалтанд тавтай морилно уу!\n\nБаярлалаа.\nХаяг: Их Наяд Зүүн Өндөр 1114, ${batch.room} тоот\nУтас: 80660314, 88559876`;
  };

  const handleCopySms = (batch: any) => {
    navigator.clipboard.writeText(getSmsTemplate(batch));
    toast({ title: "Message Copied", description: "SMS template copied to clipboard" });
  };

  const handleDeleteBatch = async () => {
    if (!deletingBatch) return;
    const { error } = await supabase.from('batches').delete().eq('id', deletingBatch.id);
    if (error) {
      toast({ title: "Error", description: "Failed to delete batch", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Batch deleted successfully" });
      fetchBatches();
    }
    setDeletingBatch(null);
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

      {/* Batch List grouped by month */}
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
            <div className="space-y-6">
              {groupedBatches.map((group) => (
                <div key={group.month}>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">
                    {group.month}
                  </h3>
                  <div className="divide-y divide-border rounded-lg border">
                    {group.batches.map((batch) => (
                      <BatchListRow
                        key={batch.id}
                        batch={batch}
                        studentCount={studentCounts[batch.id] || 0}
                        onEdit={() => handleEdit(batch)}
                        onCopyLink={() => handleCopyLink(batch)}
                        onOpenLink={() => handleOpenLink(batch)}
                        onRegenerateLink={() => handleRegenerateLink(batch)}
                        onCopySms={() => handleCopySms(batch)}
                        onDelete={() => setDeletingBatch(batch)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog (split pane) */}
      <BatchDetailsDialog
        batch={selectedBatch}
        studentCount={selectedBatch ? studentCounts[selectedBatch.id] || 0 : 0}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={handleUpdate}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingBatch} onOpenChange={(open) => !open && setDeletingBatch(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this batch and all associated students. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBatch} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}