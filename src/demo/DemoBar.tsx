import { useEffect, useState } from 'react';
import { Clock, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DemoRole } from './storageKey';

export function DemoBar({ role, practiceOnly, expiresAt, onSwitch, onEnd }: { role: DemoRole; practiceOnly: boolean; expiresAt: string; onSwitch(r: DemoRole): void; onEnd(): void }) {
  const left = () => Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(left);
  useEffect(() => { const t = window.setInterval(() => setRemaining(left()), 1000); return () => clearInterval(t); }, [expiresAt]);
  useEffect(() => { if (remaining === 0) onEnd(); }, [remaining]);
  return (
    <div className="flex w-full items-center justify-center gap-2 border-b bg-background px-2 py-1 md:fixed md:bottom-4 md:right-4 md:z-[60] md:w-auto md:rounded-full md:border md:bg-background/85 md:backdrop-blur md:shadow-sm md:pointer-events-auto">
      {!practiceOnly && <Tabs value={role} onValueChange={v => onSwitch(v as DemoRole)}><TabsList className="h-8 rounded-full"><TabsTrigger className="rounded-full text-xs" value="student">Student</TabsTrigger><TabsTrigger className="rounded-full text-xs" value="teacher">Teacher</TabsTrigger><TabsTrigger className="rounded-full text-xs" value="admin">Admin</TabsTrigger></TabsList></Tabs>}
      <span className="font-mono text-xs flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</span>
      <Button variant="ghost" size="sm" className="h-8 rounded-full" aria-label="End demo" onClick={onEnd}><LogOut className="h-4 w-4" /><span className="hidden sm:inline">End demo</span></Button>
    </div>
  );
}
