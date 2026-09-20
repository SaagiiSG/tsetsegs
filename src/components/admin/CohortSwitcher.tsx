import { Globe, Flag } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAdminCohort } from '@/contexts/AdminCohortContext';
import type { Cohort } from '@/lib/cohort';

/**
 * Dev-only dropdown in the admin header that switches the whole admin panel
 * between the Mongolian and International student worlds.
 */
export function CohortSwitcher() {
  const { cohort, setCohort, canSwitch } = useAdminCohort();
  if (!canSwitch) return null;

  return (
    <Select value={cohort} onValueChange={(v) => setCohort(v as Cohort)}>
      <SelectTrigger
        className="w-auto h-8 gap-2 text-xs font-medium border-dashed"
        aria-label="Switch student cohort"
      >
        {cohort === 'intl' ? (
          <Globe className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Flag className="h-3.5 w-3.5 text-primary" />
        )}
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="mn">
          <span className="flex items-center gap-2">
            <Flag className="h-3.5 w-3.5" /> Mongolian
          </span>
        </SelectItem>
        <SelectItem value="intl">
          <span className="flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" /> International
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
