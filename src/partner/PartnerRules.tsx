import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PARTNER_RULES } from '../../supabase/functions/_shared/partner-rules';

export default function PartnerRules() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">How you get paid</CardTitle></CardHeader>
      <CardContent><ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">{PARTNER_RULES.map(r => <li key={r}>{r}</li>)}</ul></CardContent>
    </Card>
  );
}
