import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FigureFields { figure_svg: string | null; figure_description: string | null }

/**
 * figure_svg and figure_description for questions whose rows come from a server
 * function that does not return them (proctor papers, proctor review, center SAT).
 */
export function useFigureFields(ids: string[], table: 'questions' | 'intl_questions' = 'questions') {
  const key = [...new Set(ids.filter(Boolean))].sort();
  const { data } = useQuery({
    queryKey: ['figure-fields', table, key],
    enabled: key.length > 0,
    staleTime: Infinity,
    queryFn: async () => {
      const byId = new Map<string, FigureFields>();
      for (let i = 0; i < key.length; i += 100) { // keeps the request URL short
        const { data, error } = await supabase
          .from(table)
          .select('id, figure_svg, figure_description')
          .in('id', key.slice(i, i + 100));
        if (error) throw error;
        for (const r of data ?? []) byId.set(r.id, r);
      }
      return byId;
    },
  });
  return data;
}
