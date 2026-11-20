import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useCenter } from './centerContext';
import type { CenterGoals } from './CenterDailyGoals';
import { AVATARS, avatarSrc } from './centerProfile';

const NONE = 'none'; // the "letter" tile: no picture, the initial shows instead

/** "Saran Ochir Sergelen" -> "Saran S.", the way solo_join and solo_set_name (0155) make the board name. */
export function boardName(full: string): string {
  const w = full.trim().split(/\s+/).filter(Boolean);
  if (w.length < 2) return w[0] ?? '';
  return `${w[0]} ${[...w[w.length - 1]][0].toUpperCase()}.`;
}

const daysTo = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

/** The student's own profile edits (Saagii, 20 Nov): a picture, the SAT date, the target score, and for solo students the name.
 *  `fullName` is null for center students, whose name the center admin keeps. */
export function EditProfileDialog({ open, onOpenChange, studentId, name, avatar, goals, fullName }: {
  open: boolean; onOpenChange: (o: boolean) => void; studentId: string; name: string; avatar: string | null; goals?: CenterGoals; fullName: string | null;
}) {
  const { center, rename, setAvatar } = useCenter();
  const qc = useQueryClient();
  const [pic, setPic] = useState(NONE);
  const [nm, setNm] = useState('');
  const [sat, setSat] = useState('');
  const [target, setTarget] = useState(1300);
  // An unset target stays unset unless the slider is moved, so opening and saving never invents one.
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPic(avatar ?? NONE); setNm(fullName ?? ''); setSat(goals?.sat_date ?? ''); setTarget(goals?.target_score ?? 1300); setTouched(false);
  }, [open, avatar, fullName, goals]);

  const trimmed = nm.trim();
  const nameChanged = fullName != null && trimmed !== fullName;
  const nameOk = !nameChanged || trimmed !== '';
  const days = sat ? daysTo(sat) : null;

  const save = async () => {
    setSaving(true);
    let failed = false;
    const picValue = pic === NONE ? '' : pic;
    if (nameChanged) {
      const { data, error } = await supabase.rpc('solo_set_name', { _name: trimmed });
      if (error) failed = true; else rename?.(data);
    }
    if (picValue !== (avatar ?? '')) {
      const { error } = await supabase.rpc('tenant_set_my_avatar', { _institution: center.id, _avatar: picValue });
      if (error) failed = true; else setAvatar?.(picValue || null);
    }
    if (sat !== (goals?.sat_date ?? '') || touched) {
      // Only these columns: an existing row keeps its ring goals and onboarding answers.
      const { error } = await supabase.from('tenant_student_goals').upsert({
        student_id: studentId, institution_id: center.id, sat_date: sat || null, ...(touched ? { target_score: target } : {}),
      });
      failed ||= !!error;
    }
    setSaving(false);
    qc.invalidateQueries({ queryKey: ['center-student-profile', center.id, studentId] });
    qc.invalidateQueries({ queryKey: ['center-goals', studentId] });
    qc.invalidateQueries({ queryKey: ['center-student'] });
    qc.invalidateQueries({ queryKey: ['solo-account'] });
    if (failed) { toast.error("Some changes didn't save. Please try again."); return; }
    toast.success('Profile saved');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Nothing focused on open: a focused date field would pop the phone's date picker straight away. */}
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Your picture shows to other students. Your test date and target stay private.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Picture</Label>
            <ToggleGroup type="single" value={pic} onValueChange={v => v && setPic(v)} className="grid grid-cols-6 gap-2">
              <ToggleGroupItem value={NONE} aria-label="No picture, show my initial" className="h-12 w-12 rounded-full p-0 data-[state=on]:bg-transparent data-[state=on]:ring-2 data-[state=on]:ring-primary data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-background">
                <Avatar className="h-12 w-12"><AvatarFallback className="sky-avatar font-semibold">{name.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
              </ToggleGroupItem>
              {AVATARS.map((a, i) => (
                <ToggleGroupItem key={a} value={a} aria-label={`Picture ${i + 1}`} className="h-12 w-12 rounded-full p-0 data-[state=on]:bg-transparent data-[state=on]:ring-2 data-[state=on]:ring-primary data-[state=on]:ring-offset-2 data-[state=on]:ring-offset-background">
                  <img src={avatarSrc(a)} alt="" className="h-12 w-12 rounded-full" loading="lazy" />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          {fullName != null ? (
            <div className="space-y-1.5">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" value={nm} maxLength={80} onChange={e => setNm(e.target.value)} autoComplete="name" />
              <p className="text-xs text-muted-foreground">
                {!nameOk ? 'Enter your name.' : `On the leaderboard: ${boardName(nm) || '…'}`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Your center manages your name. Ask them to change it.</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="profile-sat">SAT test date</Label>
            <Input id="profile-sat" type="date" value={sat} onChange={e => setSat(e.target.value)} />
            {days !== null && days >= 0 && <p className="text-xs text-muted-foreground">{days} days to go</p>}
          </div>
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <Label>Target score</Label>
              {touched || goals?.target_score != null
                ? <span className="font-mono text-lg font-semibold">{target}</span>
                : <span className="text-sm text-muted-foreground">Not set</span>}
            </div>
            <Slider min={1000} max={1600} step={50} value={[target]} onValueChange={([v]) => { setTarget(v); setTouched(true); }} aria-label="Target score" />
          </div>
          <Button className="w-full" onClick={save} disabled={saving || !nameOk}><Check className="h-4 w-4" />Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
