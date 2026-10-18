import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ON_TARGET_POINTS, summarizeMisses } from '@/lib/predictionAccuracy';

/** Platform admins only: how the prediction did across every real SAT entered so far. */
export function AlgorithmAccuracySummary() {
  const { data } = useQuery({
    queryKey: ['sat-prediction-accuracy'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('sat_prediction_accuracy' as any);
      if (error) return null;
      return summarizeMisses(((data as any[]) ?? []).map(r => r.miss).filter((m: any) => typeof m === 'number'));
    },
    staleTime: 60_000,
  });
  if (data === undefined) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {data
        ? `Across ${data.count} real SAT${data.count === 1 ? '' : 's'}: average miss ${data.avgMiss} pts, ${Math.round(data.onTargetShare * 100)}% within ${ON_TARGET_POINTS}, leaning ${data.bias > 0 ? 'high' : data.bias < 0 ? 'low' : 'even'} (${data.bias > 0 ? '+' : ''}${data.bias}).`
        : 'No real SAT has been checked against a saved prediction yet.'}
    </p>
  );
}
