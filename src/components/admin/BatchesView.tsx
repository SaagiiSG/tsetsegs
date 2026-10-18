import { useState, useEffect, useMemo } from 'react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Filter, CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BatchWizard } from './batches/BatchWizard';
import { ScheduleTemplatesDialog } from './batches/ScheduleTemplatesDialog';
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
import { useAdminCohort } from '@/contexts/AdminCohortContext';

export function BatchesView() {
  const { cohort } = useAdminCohort();
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
  const [wizardOpen, setWizardOpen] = useState(searchParams.get('create') === '1');
  const [schedulesOpen, setSchedulesOpen] = useState(false);
  const activeFilters = [selectedCourse, selectedIntake, selectedTeacher].filter(v => v !== 'all').length;

  useEffect(() => {
    fetchBatches();
  }, [cohort]);

  useEffect(() => {
    if (batches.length > 0) {
      fetchStudentCounts();
      if (batchIdFromUrl) {
        const batchToOpen = batches.find(b => b.id === batchIdFromUrl);
        if (batchToOpen) {
          setSelectedBatch(batchToOpen);
          setDialogOpen(true);
        }
        if (batchToOpen) setSearchParams({}, { replace: true });
      }
    }
  }, [batches, batchIdFromUrl]);

  const fetchBatches = async () => {
    const { data } = await supabase
      .from('batches')
      .select('*')
      .eq('is_international', cohort === 'intl')
      .order('start_date', { ascending: false });
    setBatches(data || []);
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

  const intakeTrend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const key = format(d, 'yyyy-MM');
      const inMonth = batches.filter(b => b.start_date?.startsWith(key));
      return { label: format(d, 'MMM'), batches: inMonth.length, students: inMonth.reduce((s, b) => s + (studentCounts[b.id] || 0), 0) };
    });
  }, [batches, studentCounts]);

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold font-chillax tracking-normal text-foreground [text-shadow:0_0_24px_hsl(var(--section-glow,12_85%_60%)/0.45)]">
          Tsetsegs Batches
        </h1>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-3.5 w-3.5" />Filter
                {activeFilters > 0 && <span className="font-mono text-xs rounded-full bg-muted px-1.5">{activeFilters}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 space-y-3">
              {[
                { label: 'Course', value: selectedCourse, set: setSelectedCourse, opts: [['all', 'All courses'], ['SAT', 'SAT'], ['IELTS', 'IELTS']] },
                { label: 'Intake', value: selectedIntake, set: setSelectedIntake, opts: [['all', 'All intakes'], ...intakes.map(i => [i, i])] },
                { label: 'Teacher', value: selectedTeacher, set: setSelectedTeacher, opts: [['all', 'All teachers'], ...teachers.map(t => [t, t])] },
              ].map(f => (
                <div key={f.label} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <Select value={f.value} onValueChange={f.set}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>{f.opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
              {activeFilters > 0 && <Button variant="ghost" size="sm" className="w-full" onClick={() => { setSelectedCourse('all'); setSelectedIntake('all'); setSelectedTeacher('all'); }}>Clear filters</Button>}
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setSchedulesOpen(true)}><CalendarDays className="h-3.5 w-3.5" />Schedules</Button>
          <Button size="sm" className="gap-2" onClick={() => setWizardOpen(true)}><Plus className="h-3.5 w-3.5" />New batch</Button>
        </div>
      </div>

      <Card className="admin-glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Intake trend</CardTitle>
          <CardDescription>Batches and students starting each month, last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ students: { label: 'Students', color: 'hsl(var(--foreground))' }, batches: { label: 'Batches', color: 'hsl(var(--muted-foreground))' } }} className="h-48 w-full">
            <LineChart data={intakeTrend} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={32} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="students" stroke="var(--color-students)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="batches" stroke="var(--color-batches)" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Batch List grouped by month */}
      <Card>
        <CardHeader>
          <CardTitle>{cohort === 'intl' ? 'International Batches' : 'All Batches'}</CardTitle>
          <CardDescription>
            Showing {filteredBatches.length} of {batches.length} batch{batches.length !== 1 ? 'es' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
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
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 sm:px-4">
                    {group.month}
                  </h3>
                  <div className="divide-y divide-border rounded-lg border overflow-hidden">
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

      <BatchWizard open={wizardOpen} onOpenChange={o => { setWizardOpen(o); if (!o && searchParams.get('create')) setSearchParams({}, { replace: true }); }}
        onCreated={(id) => { fetchBatches().then(() => setSearchParams({ batch: id }, { replace: true })); }} />
      <ScheduleTemplatesDialog open={schedulesOpen} onOpenChange={setSchedulesOpen} />

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