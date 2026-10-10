import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PortalSettings = { display_name?: string; logo_url?: string; brand_color?: string; contact_email?: string; timezone?: string };
export type Center = { id: string; name: string; country: string; slug: string; portal_settings?: PortalSettings | null };
export type CenterRole = 'center_admin' | 'teacher' | 'student';

type Ctx = { center: Center; role: CenterRole | null; name: string; userId: string | null; signOut: () => void; reloadCenter: () => void };
export const CenterContext = createContext<Ctx | null>(null);
export function useCenter() {
  const ctx = useContext(CenterContext);
  if (!ctx) throw new Error('useCenter outside portal');
  return ctx;
}

export const centerDisplayName = (c: Center) => c.portal_settings?.display_name || c.name;

/** "#rrggbb" -> "h s% l%" for HSL tokens. */
export function hexToHslToken(hex: string): string | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  const [r, g, b] = m.slice(1).map(x => parseInt(x, 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Applies the center brand color as primary/ring tokens on body so dialogs inherit it. */
export function useCenterBrand(center: Center | null | undefined) {
  const color = center?.portal_settings?.brand_color;
  useEffect(() => {
    const token = color ? hexToHslToken(color) : null;
    const body = document.body;
    if (!token) return;
    const [, , l] = token.split(' ');
    body.style.setProperty('--primary', token);
    body.style.setProperty('--ring', token);
    body.style.setProperty('--primary-foreground', parseInt(l) > 60 ? '0 0% 9%' : '0 0% 100%');
    return () => { ['--primary', '--ring', '--primary-foreground'].forEach(p => body.style.removeProperty(p)); };
  }, [color]);
}

export function CenterLogo({ center, className = 'h-8 w-8' }: { center: Center; className?: string }) {
  const logo = center.portal_settings?.logo_url;
  const label = centerDisplayName(center);
  return logo
    ? <img src={logo} alt={`${label} logo`} className={`${className} rounded-md object-contain bg-background`} />
    : <span aria-hidden className={`${className} rounded-md bg-primary text-primary-foreground grid place-items-center font-chillax font-semibold text-sm`}>{label.slice(0, 1).toUpperCase()}</span>;
}

export function PortalShell({ title, nav, glass = false, children }: { title: string; nav?: ReactNode; glass?: boolean; children: ReactNode }) {
  const { center, name, signOut } = useCenter();
  // Glass mode opts into the liquid-glass admin theme for this page's lifetime.
  useEffect(() => {
    if (!glass) return;
    document.body.classList.add('admin-theme');
    return () => document.body.classList.remove('admin-theme');
  }, [glass]);
  return (
    <div
      className={`min-h-screen bg-background text-foreground ${glass ? 'admin-glow-scope' : ''}`}
      style={glass ? ({ '--section-glow': '152 60% 42%' } as React.CSSProperties) : undefined}
    >
      <header className={glass
        ? 'sticky top-0 z-20 admin-glass-bar'
        : 'sticky top-0 z-20 border-b bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70'}>
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
          <CenterLogo center={center} />
          <div className="min-w-0">
            <p className="font-chillax font-semibold truncate leading-tight">{centerDisplayName(center)}</p>
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
