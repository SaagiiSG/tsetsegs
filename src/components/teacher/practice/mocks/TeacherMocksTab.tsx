import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Clock, HelpCircle, Eye } from 'lucide-react';
import StudentTestPreview from '@/components/admin/bluebook/StudentTestPreview';

interface MockTest {
  id: string;
  name: string;
  description: string | null;
  section_type: string | null;
  test_month: number | null;
  test_year: number | null;
  variant: string | null;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const sectionLabel = (s?: string | null) => {
  if (s === 'math') return 'Math';
  if (s === 'english' || s === 'reading_writing') return 'Reading & Writing';
  return 'Full test';
};

export function TeacherMocksTab() {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  const { data: tests, isLoading } = useQuery({
    queryKey: ['teacher-published-mocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_tests')
        .select('id, name, description, section_type, test_month, test_year, variant')
        .eq('is_published', true)
        .order('test_year', { ascending: false, nullsFirst: false })
        .order('test_month', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as MockTest[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['teacher-published-mock-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bluebook_modules')
        .select('test_id, section, time_limit_minutes, bluebook_module_questions(count)');
      if (error) throw error;
      const map: Record<
        string,
        { questions: number; minutes: number; modules: number; sections: Set<string> }
      > = {};
      (data ?? []).forEach((m: any) => {
        const entry = (map[m.test_id] ||= {
          questions: 0,
          minutes: 0,
          modules: 0,
          sections: new Set<string>(),
        });
        entry.questions += m.bluebook_module_questions?.[0]?.count || 0;
        entry.minutes += m.time_limit_minutes || 0;
        entry.modules += 1;
        if (m.section) entry.sections.add(m.section);
      });
      return map;
    },
  });

  const years = useMemo(
    () =>
      Array.from(new Set((tests ?? []).map((t) => t.test_year).filter(Boolean) as number[])).sort(
        (a, b) => b - a
      ),
    [tests]
  );

  const filtered = useMemo(
    () =>
      (tests ?? []).filter((t) => {
        if (sectionFilter !== 'all' && (t.section_type ?? 'full') !== sectionFilter) return false;
        if (yearFilter !== 'all' && String(t.test_year ?? '') !== yearFilter) return false;
        return true;
      }),
    [tests, sectionFilter, yearFilter]
  );

  if (previewId) {
    return (
      <StudentTestPreview testId={previewId} onBack={() => setPreviewId(null)} hideEditorLink />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Published mock tests</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          These are the mock tests students can currently take from their practice page. Open a
          preview to see the exact questions, passages and figures they get — nothing is saved or
          scored.
        </p>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Select value={sectionFilter} onValueChange={setSectionFilter}>
          <SelectTrigger className="h-9 w-[160px] text-xs">
            <SelectValue placeholder="Section" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sections</SelectItem>
            <SelectItem value="math">Math</SelectItem>
            <SelectItem value="english">Reading & Writing</SelectItem>
            <SelectItem value="full">Full test</SelectItem>
          </SelectContent>
        </Select>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="h-9 w-[130px] text-xs">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No published mock tests match these filters.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((t) => {
            const s = stats?.[t.id];
            const dateLabel = [t.test_month ? MONTHS[t.test_month - 1] : null, t.test_year]
              .filter(Boolean)
              .join(' ');
            return (
              <Card key={t.id} className="p-4 flex flex-col gap-3">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold leading-tight">{t.name}</h4>
                    <Badge className="text-[10px] shrink-0">Live</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <Badge variant="secondary" className="text-[10px]">
                      {sectionLabel(t.section_type)}
                    </Badge>
                    {dateLabel && (
                      <Badge variant="outline" className="text-[10px]">
                        {dateLabel}
                      </Badge>
                    )}
                    {t.variant && (
                      <Badge variant="outline" className="text-[10px]">
                        {t.variant}
                      </Badge>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {t.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {s?.modules ?? 0} modules
                  </span>
                  <span className="flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" />
                    {s?.questions ?? 0} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {s?.minutes ?? 0} min
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 mt-auto"
                  onClick={() => setPreviewId(t.id)}
                >
                  <Eye className="h-4 w-4" /> Preview questions
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
