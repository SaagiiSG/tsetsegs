import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFeatureFlags() {
  const { data: flags = [], isLoading } = useQuery({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*');
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // cache 5 min
  });

  const isEnabled = (key: string) => {
    const flag = flags.find((f) => f.feature_key === key);
    return flag?.is_enabled ?? false;
  };

  return { flags, isLoading, isEnabled };
}
