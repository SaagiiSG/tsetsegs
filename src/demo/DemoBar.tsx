import { useEffect, useState } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DemoRole } from './storageKey';

export function DemoBar({ role, practiceOnly, expiresAt, onSwitch, onEnd }: { role: DemoRole; practiceOnly: boolean; expiresAt: string; onSwitch(r: DemoRole): void; onEnd(): void }) {
  const left = () => Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(left);
  useEffect(() => { const t = window.setInterval(() => setRemaining(left()), 1000); return () => clearInterval(t); }, [expiresAt]);
  useEffect(() => { if (remaining === 0) onEnd(); }, [remaining]);
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  // Above dialog overlays (z-50) and clickable while a modal dialog turns pointer events off, at every width.
  return (
    <>
      {/* Phone: one bubble above the dock instead of a top strip, which covered screens' X buttons and menus (Saagii, 6 Nov). */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button aria-label={`Demo menu, ${clock} left`} className="md:hidden pointer-events-auto fixed right-3 z-[60] h-14 w-14 rounded-full shadow-lg flex-col gap-0.5 font-mono text-xs"
            style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}>
            <Clock className="h-3.5 w-3.5" />{clock}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="pointer-events-auto z-[61] w-44">
          {!practiceOnly && <>
            <DropdownMenuRadioGroup value={role} onValueChange={v => v !== role && onSwitch(v as DemoRole)}>
              <DropdownMenuRadioItem value="student">Student</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="teacher">Teacher</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
          </>}
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onEnd}><LogOut className="h-4 w-4 mr-2" />End demo</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="pointer-events-auto hidden md:flex fixed bottom-4 right-4 z-[60] items-center gap-2 rounded-full border bg-background/85 backdrop-blur shadow-sm px-2 py-1">
        {!practiceOnly && <Tabs value={role} onValueChange={v => onSwitch(v as DemoRole)}><TabsList className="h-8 rounded-full"><TabsTrigger className="rounded-full text-xs" value="student">Student</TabsTrigger><TabsTrigger className="rounded-full text-xs" value="teacher">Teacher</TabsTrigger><TabsTrigger className="rounded-full text-xs" value="admin">Admin</TabsTrigger></TabsList></Tabs>}
        <span className="font-mono text-xs flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{clock}</span>
        <Button variant="ghost" size="sm" className="h-8 rounded-full" aria-label="End demo" onClick={onEnd}><LogOut className="h-4 w-4" />End demo</Button>
      </div>
    </>
  );
}
