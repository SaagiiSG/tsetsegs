import { useNavigate } from 'react-router-dom';
import { QuestionSearchPanel } from '@/components/questions/QuestionSearchPanel';
import { Search } from 'lucide-react';

export default function StudentQuestionSearch() {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold">Search Questions</h1>
          <p className="text-xs text-muted-foreground">
            Find any practice question by keyword and solve it right away.
          </p>
        </div>
      </div>

      <QuestionSearchPanel
        scope="student"
        autoFocus
        note="Practice-test (mock) questions are not searchable — those only appear inside a real test."
        onSelect={(r) => {
          if (r.subject === 'english') {
            navigate(`/practice/english/question/${r.id}`);
          } else {
            navigate(`/practice/question/${r.id}`);
          }
        }}
      />
    </div>
  );
}
