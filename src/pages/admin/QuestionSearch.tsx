import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QuestionSearchPanel } from '@/components/questions/QuestionSearchPanel';
import { QuestionForm } from '@/components/admin/questions/QuestionForm';
import { Search } from 'lucide-react';

export default function QuestionSearch() {
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: editingQuestion } = useQuery({
    queryKey: ['admin-search-question', editingId],
    enabled: !!editingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', editingId as string)
        .single();
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold">Search Questions</h1>
          <p className="text-xs text-muted-foreground">
            Keyword search across every set — 68, CollegeBoard, 150 Hard, New 120, External and practice-test (BBK) questions.
          </p>
        </div>
      </div>

      <QuestionSearchPanel
        scope="admin"
        autoFocus
        note="Admin scope includes inactive and practice-only (BBK) questions. Click a result to edit it."
        onSelect={(r) => setEditingId(r.id)}
      />

      {editingId && editingQuestion && (
        <QuestionForm
          open
          onOpenChange={(v) => !v && setEditingId(null)}
          editingQuestion={editingQuestion as any}
        />
      )}
    </div>
  );
}
