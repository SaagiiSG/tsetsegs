import { useState } from 'react';
import { QuestionSearchPanel } from '@/components/questions/QuestionSearchPanel';
import { TeacherQuestionViewer } from '../TeacherQuestionViewer';
import type { QuestionSearchResult } from '@/hooks/useQuestionSearch';
import { Search } from 'lucide-react';

export function TeacherQuestionSearchTab() {
  const [results, setResults] = useState<QuestionSearchResult[]>([]);
  const [index, setIndex] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-primary" />
        <h3 className="text-sm md:text-base font-semibold">Keyword Search</h3>
      </div>

      <QuestionSearchPanel
        scope="teacher"
        note="Searches every set (68, CollegeBoard, 150 Hard, New 120, External, English). Practice-test questions stay hidden."
        onSelect={(_r, i, rows) => {
          setResults(rows);
          setIndex(i);
        }}
      />

      {index !== null && results[index] && (
        <TeacherQuestionViewer
          open
          onOpenChange={(v) => !v && setIndex(null)}
          questionId={results[index].id}
          onNext={index < results.length - 1 ? () => setIndex(index + 1) : undefined}
          onPrev={index > 0 ? () => setIndex(index - 1) : undefined}
          currentIndex={index}
          totalCount={results.length}
        />
      )}
    </div>
  );
}
