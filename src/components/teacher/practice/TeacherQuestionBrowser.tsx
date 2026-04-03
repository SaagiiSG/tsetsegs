import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { TeacherQuestionViewer } from './TeacherQuestionViewer';

const MATH_QUESTION_SETS = [
  { value: 'all', label: 'All Questions' },
  { value: '68', label: '68 Problems' },
  { value: 'cb', label: 'CollegeBoard' },
  { value: '150_hard', label: '150 Hard' },
];

const ENGLISH_QUESTION_SETS = [
  { value: 'all', label: 'All Questions' },
];

const DIFFICULTIES = [
  { value: 'all', label: 'All Levels' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export function TeacherQuestionBrowser() {
  const [questionSet, setQuestionSet] = useState('all');
  const [difficulty, setDifficulty] = useState('all');
  const [subject, setSubject] = useState<'math' | 'english'>('math');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['question-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('question_categories')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const [categoryId, setCategoryId] = useState('all');

  const { data: questions, isLoading } = useQuery({
    queryKey: ['teacher-browse-questions', questionSet, difficulty, subject, categoryId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select('id, question_id, question_text, question_image_url, difficulty_level, question_type, subject, category:question_categories(name)')
        .eq('is_active', true)
        .order('question_id');

      if (subject === 'english') {
        query = query.eq('subject', 'english');
      } else {
        query = query.or('subject.is.null,subject.eq.math');
      }

      if (questionSet === '68') {
        query = query.like('question_id', '68%');
      } else if (questionSet === 'cb') {
        query = query.not('original_cb_id', 'is', null);
      } else if (questionSet === '150_hard') {
        query = query.eq('question_set', 'SATMathTraining800');
      } else if (questionSet === 'english') {
        query = query.eq('subject', 'english');
      }

      if (difficulty !== 'all') {
        query = query.eq('difficulty_level', difficulty);
      }

      if (categoryId !== 'all') {
        query = query.eq('category_id', categoryId);
      }

      if (searchQuery.trim()) {
        query = query.or(`question_id.ilike.%${searchQuery}%,question_text.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data;
    },
  });

  const difficultyColor = (level: string | null) => {
    if (level === 'hard') return 'border-red-500 text-red-500';
    if (level === 'medium') return 'border-yellow-500 text-yellow-500';
    return 'border-green-500 text-green-500';
  };

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-wrap gap-2">
              {/* Subject toggle */}
              <div className="flex rounded-lg border overflow-hidden">
                <Button
                  variant={subject === 'math' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 rounded-none text-xs"
                  onClick={() => {
                    setSubject('math');
                    setQuestionSet('all');
                  }}
                >
                  Math
                </Button>
                <Button
                  variant={subject === 'english' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 rounded-none text-xs"
                  onClick={() => {
                    setSubject('english');
                    setQuestionSet('all');
                  }}
                >
                  English
                </Button>
              </div>

              <Select value={questionSet} onValueChange={setQuestionSet}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
              {(subject === 'english' ? ENGLISH_QUESTION_SETS : MATH_QUESTION_SETS).map(s => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIFFICULTIES.map(d => (
                    <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-8 w-[150px] text-xs">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Categories</SelectItem>
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by ID or text..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !questions || questions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground text-sm">
              No questions found with these filters
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">
              {questions.length} question{questions.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {questions.map((q, index) => {
                const displayId = q.question_id;
                let simpleId = displayId;
                if (displayId.startsWith('CB')) {
                  const num = parseInt(displayId.replace('CB', ''), 10);
                  simpleId = isNaN(num) ? displayId : String(num);
                } else if (displayId.startsWith('ENG')) {
                  const num = parseInt(displayId.replace('ENG', ''), 10);
                  simpleId = isNaN(num) ? displayId : String(num);
                }

                return (
                  <Card
                    key={q.id}
                    className="cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] hover:border-primary/40"
                    onClick={() => setSelectedQuestionIndex(index)}
                  >
                    <CardContent className="p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs">{simpleId}</span>
                        {q.question_image_url && (
                          <img src={q.question_image_url} alt="" className="h-4 w-4 rounded object-contain" />
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {q.difficulty_level && (
                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${difficultyColor(q.difficulty_level)}`}>
                            {q.difficulty_level}
                          </Badge>
                        )}
                        {q.category?.name && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 truncate max-w-full">
                            {(q.category as any).name?.split(' ')[0] || ''}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Question Viewer Dialog */}
      {selectedQuestionIndex !== null && questions && (
        <TeacherQuestionViewer
          open={true}
          onOpenChange={(v) => !v && setSelectedQuestionIndex(null)}
          questionId={questions[selectedQuestionIndex]?.id}
          onNext={selectedQuestionIndex < questions.length - 1 ? () => setSelectedQuestionIndex(selectedQuestionIndex + 1) : undefined}
          onPrev={selectedQuestionIndex > 0 ? () => setSelectedQuestionIndex(selectedQuestionIndex - 1) : undefined}
          currentIndex={selectedQuestionIndex}
          totalCount={questions.length}
        />
      )}
    </>
  );
}
