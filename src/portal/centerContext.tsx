import { createContext, useContext, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type Center = { id: string; name: string; country: string; slug: string };
export type CenterRole = 'center_admin' | 'teacher' | 'student';

type Ctx = { center: Center; role: CenterRole | null; name: string; userId: string | null; signOut: () => void };
export const CenterContext = createContext<Ctx | null>(null);
export function useCenter() {
  const ctx = useContext(CenterContext);
  if (!ctx) throw new Error('useCenter outside portal');
  return ctx;
}

export function PortalShell({ title, nav, children }: { title: string; nav?: ReactNode; children: ReactNode }) {
  const { center, name, signOut } = useCenter();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
          <div className="min-w-0">
            <p className="font-chillax font-semibold truncate leading-tight">{center.name}</p>
            <p className="text-xs text-muted-foreground leading-tight">{title}</p>
          </div>
          <div className="flex-1">{nav}</div>
          <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-40">{name}</span>
          <Button variant="ghost" size="sm" onClick={signOut} aria-label="Sign out"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

export const STATUS_LABEL: Record<string, string> = { present: 'Present', late: 'Late', absent: 'Absent', sick: 'Sick', excused: 'Excused' };
export const STATUS_ORDER = ['present', 'late', 'absent', 'sick', 'excused'];
export const STATUS_STYLE: Record<string, string> = {
  present: 'bg-status-healthy/10 text-status-healthy',
  late: 'bg-status-watch/10 text-status-watch',
  absent: 'bg-status-risk/10 text-status-risk',
  sick: 'bg-muted text-muted-foreground',
  excused: 'bg-muted text-muted-foreground',
};
