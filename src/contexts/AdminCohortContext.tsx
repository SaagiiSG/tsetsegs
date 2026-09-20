import { createContext, useContext, useState, type ReactNode } from 'react';
import { useIsDevAccount } from '@/lib/devAccount';
import type { Cohort } from '@/lib/cohort';

/**
 * Which student world the admin panel is currently showing.
 *
 * - Dev admin accounts can switch between 'mn' (Mongolian) and 'intl'
 *   (International) via the header dropdown. The choice is persisted in
 *   localStorage.
 * - Every other account is hard-forced to 'mn' — a saved 'intl' value can
 *   never leak international data to a regular admin.
 */

const STORAGE_KEY = 'admin:cohort';

interface AdminCohortContextValue {
  cohort: Cohort;
  setCohort: (cohort: Cohort) => void;
  /** Whether the switcher UI should be shown at all. */
  canSwitch: boolean;
}

const AdminCohortContext = createContext<AdminCohortContextValue>({
  cohort: 'mn',
  setCohort: () => {},
  canSwitch: false,
});

function readSavedCohort(): Cohort {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'intl' ? 'intl' : 'mn';
  } catch {
    return 'mn';
  }
}

export function AdminCohortProvider({ children }: { children: ReactNode }) {
  const isDev = useIsDevAccount();
  const [saved, setSaved] = useState<Cohort>(readSavedCohort);

  const setCohort = (cohort: Cohort) => {
    try {
      localStorage.setItem(STORAGE_KEY, cohort);
    } catch {
      // storage unavailable — keep in-memory only
    }
    setSaved(cohort);
  };

  return (
    <AdminCohortContext.Provider
      value={{ cohort: isDev ? saved : 'mn', setCohort, canSwitch: isDev }}
    >
      {children}
    </AdminCohortContext.Provider>
  );
}

export function useAdminCohort() {
  return useContext(AdminCohortContext);
}
