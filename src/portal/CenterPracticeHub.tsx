import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Gamepad2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MathText } from '@/components/MathText';
import { TeacherQuestionBrowser } from '@/components/teacher/practice/TeacherQuestionBrowser';
import { TeacherQuestionViewer } from '@/components/teacher/practice/TeacherQuestionViewer';
import { useDebounced } from '@/hooks/useQuestionSearch';
import { TeacherLive } from './LiveSession';

export type PracticeTab = 'browse' | 'search' | 'live';

/** Keyword search over the International bank, by question ID or text. Practice-test copies stay hidden. */
export const searchTerm = (raw: string) => raw.trim().replace(/[,()%*\\]/g, ' ').replace(/\s+/g, ' ').trim();

function CenterQuestionSearch() {
  const [q, setQ] = useState('');
  const [subject, setSubject] = useState<'all' | 'math' | 'english'>('all');
  const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
  const [index, setIndex] = useState<number | null>(null);
  const term = searchTerm(useDebounced(q));
  const { data, isLoading } = useQuery({
    queryKey: ['center-practice-search', term, subject, difficulty],
    queryFn: async () => {
      let query = supabase.from('intl_questions')
        .select('id, question_id, question_text, subject, subtopic, difficulty_level, question_set')
        .eq('is_active', true).eq('hide_from_practice', false).order('question_id').limit(60);
      if (term) query = query.or(`question_id.ilike.%${term}%,question_text.ilike.%${term}%`);
      if (subject !== 'all') query = query.eq('subject', subject);
      if (difficulty !== 'all') query = query.eq('difficulty_level', difficulty);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-2 md:p-3 admin-glass rounded-xl border">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by ID or text…" aria-label="Search questions" className="pl-9 border-0 bg-transparent" />
        </div>
        <Select value={subject} onValueChange={v => setSubject(v as typeof subject)}>
          <SelectTrigger className="h-9 w-32 rounded-xl text-sm border-0 bg-transparent"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All subjects</SelectItem><SelectItem value="math">Math</SelectItem><SelectItem value="english">English</SelectItem></SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={v => setDifficulty(v as typeof difficulty)}>
          <SelectTrigger className="h-9 w-32 rounded-xl text-sm border-0 bg-transparent"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All levels</SelectItem><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
        </Select>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : !data?.length ? (
        <p className="text-sm text-muted-foreground">No questions match.</p>
      ) : (
        <div className="grid gap-3">
          {data.map((question, i) => (
            <button key={question.id} type="button" onClick={() => setIndex(i)}
              className="text-left admin-glass-card admin-glass-liquid admin-glass-neutral rounded-2xl border p-4 space-y-2 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/60">
                <span className="font-mono text-foreground/80">{question.question_id}</span>
                <span className="capitalize border rounded-full px-2 py-0.5">{question.subject}</span>
                {question.subtopic && <span className="border rounded-full px-2 py-0.5">{question.subtopic}</span>}
                {question.difficulty_level && <span className="capitalize border rounded-full px-2 py-0.5">{question.difficulty_level}</span>}
              </div>
              <div className="text-sm leading-relaxed line-clamp-3"><MathText text={question.question_text ?? ''} /></div>
            </button>
          ))}
        </div>
      )}
      {index !== null && data?.[index] && (
        <TeacherQuestionViewer
          open
          onOpenChange={v => !v && setIndex(null)}
          questionId={data[index].id}
          table="intl_questions"
          onNext={index < data.length - 1 ? () => setIndex(index + 1) : undefined}
          onPrev={index > 0 ? () => setIndex(index - 1) : undefined}
          currentIndex={index}
          totalCount={data.length}
        />
      )}
    </div>
  );
}

/** The center teacher's Practice page: Browse, Search and Live, laid out like the main dashboard's practice hub. */
export function CenterPracticeHub({ tab, onTabChange, classes, studentCount, liveClassId, onLiveClassChange }: {
  tab: PracticeTab;
  onTabChange: (tab: PracticeTab) => void;
  classes: { id: string; name: string }[];
  studentCount: (classId: string) => number;
  liveClassId: string | null;
  onLiveClassChange: (classId: string) => void;
}) {
  return (
    <Tabs value={tab} onValueChange={v => onTabChange(v as PracticeTab)} className="space-y-4">
      <TabsList className="grid w-full grid-cols-3 h-10">
        <TabsTrigger value="browse" className="text-[11px] md:text-sm gap-1.5"><BookOpen className="h-3.5 w-3.5" /><span>Browse</span></TabsTrigger>
        <TabsTrigger value="search" className="text-[11px] md:text-sm gap-1.5"><Search className="h-3.5 w-3.5" /><span>Search</span></TabsTrigger>
        <TabsTrigger value="live" className="text-[11px] md:text-sm gap-1.5"><Gamepad2 className="h-3.5 w-3.5" /><span>Live</span></TabsTrigger>
      </TabsList>
      <TabsContent value="browse"><TeacherQuestionBrowser table="intl_questions" /></TabsContent>
      <TabsContent value="search"><CenterQuestionSearch /></TabsContent>
      <TabsContent value="live" className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 p-2 md:p-3 admin-glass rounded-xl border">
          <Select value={liveClassId ?? ''} onValueChange={onLiveClassChange}>
            <SelectTrigger aria-label="Class" className="h-9 rounded-xl text-sm flex-1 md:max-w-xs border-0 bg-transparent"><SelectValue placeholder="Pick a class" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {liveClassId
          ? <TeacherLive classId={liveClassId} studentCount={studentCount(liveClassId)} />
          : <p className="text-sm text-muted-foreground">Pick a class to start a live session.</p>}
      </TabsContent>
    </Tabs>
  );
}
