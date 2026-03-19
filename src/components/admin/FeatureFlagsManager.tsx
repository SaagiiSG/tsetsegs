import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';

export function FeatureFlagsManager() {
  const { flags, isLoading } = useFeatureFlags();
  const queryClient = useQueryClient();

  const toggleFlag = async (id: string, currentValue: boolean) => {
    const { error } = await supabase
      .from('feature_flags')
      .update({ is_enabled: !currentValue, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update flag');
      return;
    }
    toast.success('Feature flag updated');
    queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
  };

  if (isLoading) return <div className="p-4 text-muted-foreground">Loading flags...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Flag className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-bold">Feature Flags</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Toggle features on/off in production. Changes take effect within 5 minutes for active users.
      </p>
      <div className="grid gap-3">
        {flags.map((flag) => (
          <Card key={flag.id} className="border">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-mono">{flag.feature_key}</CardTitle>
                  <Badge variant={flag.is_enabled ? 'default' : 'secondary'}>
                    {flag.is_enabled ? 'ON' : 'OFF'}
                  </Badge>
                </div>
                <Switch
                  checked={flag.is_enabled}
                  onCheckedChange={() => toggleFlag(flag.id, flag.is_enabled)}
                />
              </div>
            </CardHeader>
            {flag.description && (
              <CardContent className="px-4 pb-3 pt-0">
                <CardDescription>{flag.description}</CardDescription>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
