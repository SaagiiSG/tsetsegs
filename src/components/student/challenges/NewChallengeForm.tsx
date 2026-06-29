import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Hash, Clock, Zap, Users, Swords, Trophy, Target, Timer, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { useFriends } from '@/hooks/useFriends';
import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { createChallenge, useMyChallenges } from '@/hooks/useChallenge';
import { FORMAT_LABELS, FORMAT_TARGETS, QUESTION_SETS, SPRINT_DURATIONS } from '@/lib/challengeScoring';

type Format = 'first_to_points' | 'first_to_correct' | 'time_sprint' | 'fixed_set';

interface Props {
  preselectFriend?: string | null;
  onCreated: (challengeId: string) => void;
}

export default function NewChallengeForm({ preselectFriend, onCreated }: Props) {
  const { student } = useStudentAuth();
  const { accepted } = useFriends();
  const { rows: myChallenges } = useMyChallenges();

  const hasActive = useMemo(
    () => myChallenges.some((r) => r.challenge.status === 'lobby' || r.challenge.status === 'active'),
    [myChallenges],
  );

  const [format, setFormat] = useState<Format>('first_to_points');
  const [subject, setSubject] = useState<'math' | 'english'>('math');
  const [questionSet, setQuestionSet] = useState('68');
  const [target, setTarget] = useState(100);
  const [duration, setDuration] = useState(300);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);

  useEffect(() => {
    if (preselectFriend) setSelected(new Set([preselectFriend]));
  }, [preselectFriend]);

  useEffect(() => {
    const opts = FORMAT_TARGETS[format];
    if (opts && !opts.includes(target)) setTarget(opts[0]);
  }, [format, target]);

  useEffect(() => {
    if (subject === 'english' && questionSet !== 'English') setQuestionSet('English');
    if (subject === 'math' && questionSet === 'English') setQuestionSet('68');
  }, [subject, questionSet]);

  const hostName = useMemo(() => {
    if (!student) return 'You';
    const ls = student.linked_student;
    if (ls) return `${ls.first_name}${ls.last_name ? ' ' + ls.last_name.charAt(0) + '.' : ''}`;
    return student.phone_number;
  }, [student]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 4) next.add(id);
    else toast.error('Max 5 players including you');
    setSelected(next);
  };

  const handleCreate = async () => {
    if (!student) return;
    if (hasActive) return toast.error('Finish or cancel your current challenge first');
    if (selected.size === 0) return toast.error('Pick at least one friend');
    setCreating(true);
    const { id, error } = await createChallenge(student.id, hostName, {
      format,
      subject,
      question_set: questionSet,
      target_value: format === 'time_sprint' ? null : target,
      duration_seconds: format === 'time_sprint' ? duration : null,
      invited_account_ids: Array.from(selected),
    });
    setCreating(false);
    if (error || !id) {
      toast.error(error ?? 'Could not create challenge');
      return;
    }
    onCreated(id);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        {hasActive && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            You already have an active challenge. Finish or cancel it before starting a new one.
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" /> Format
          </label>
          <Dialog open={formatDialogOpen} onOpenChange={setFormatDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full justify-between h-auto py-3">
                <span className="font-semibold">{FORMAT_LABELS[format]}</span>
                <span className="text-xs text-muted-foreground">Tap to change</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-primary" />
                  Choose challenge format
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 pt-2">
                {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => {
                  const descs: Record<Format, string> = {
                    first_to_points: 'Race to reach a point target first.',
                    first_to_correct: 'Race to answer N questions correctly.',
                    time_sprint: 'Answer as many as you can before time runs out.',
                    fixed_set: 'Everyone gets the same set — fastest wins.',
                  };
                  const icons: Record<Format, React.ReactNode> = {
                    first_to_points: <Trophy className="h-5 w-5" />,
                    first_to_correct: <Target className="h-5 w-5" />,
                    time_sprint: <Timer className="h-5 w-5" />,
                    fixed_set: <Layers className="h-5 w-5" />,
                  };
                  return (
                    <Button
                      key={f}
                      variant={format === f ? 'default' : 'outline'}
                      onClick={() => {
                        setFormat(f);
                        setFormatDialogOpen(false);
                      }}
                      className="h-auto py-4 justify-start gap-3 text-left"
                    >
                      <span className="shrink-0">{icons[f]}</span>
                      <div className="flex flex-col items-start">
                        <span className="font-semibold">{FORMAT_LABELS[f]}</span>
                        <span className="text-xs opacity-80 font-normal">{descs[f]}</span>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Subject</label>
            <Select value={subject} onValueChange={(v: 'math' | 'english') => setSubject(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="math">Math</SelectItem>
                <SelectItem value="english">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Question set</label>
            <Select value={questionSet} onValueChange={setQuestionSet}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_SETS.filter((qs) =>
                  subject === 'english' ? qs.value === 'English' || qs.value === 'all' : qs.value !== 'English',
                ).map((qs) => (
                  <SelectItem key={qs.value} value={qs.value}>
                    {qs.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {format === 'time_sprint' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Duration
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SPRINT_DURATIONS.map((d) => (
                <Button key={d} variant={duration === d ? 'default' : 'outline'} size="sm" onClick={() => setDuration(d)}>
                  {d / 60} min
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Hash className="h-4 w-4 text-primary" />
              {format === 'first_to_points' ? 'Points target' : format === 'first_to_correct' ? 'Correct target' : 'Set size'}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {FORMAT_TARGETS[format].map((t) => (
                <Button key={t} variant={target === t ? 'default' : 'outline'} size="sm" onClick={() => setTarget(t)}>
                  {t}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Invite friends (up to 4 + you)
          </label>
          {accepted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No friends yet — add one from the Friends tab.</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
              {accepted.map((f) => (
                <label key={f.id} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-muted/50 rounded">
                  <Checkbox checked={selected.has(f.friend_account_id)} onCheckedChange={() => toggle(f.friend_account_id)} />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{f.friend_name}</div>
                    <div className="text-xs text-muted-foreground">{f.friend_phone}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <Button className="w-full" size="lg" onClick={handleCreate} disabled={creating || selected.size === 0 || hasActive}>
          {creating ? 'Creating…' : 'Create challenge'}
        </Button>
      </CardContent>
    </Card>
  );
}
