import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { createChallenge } from '@/hooks/useChallenge';
import { FORMAT_LABELS, FORMAT_TARGETS, QUESTION_SETS, SPRINT_DURATIONS } from '@/lib/challengeScoring';

type Format = 'first_to_points' | 'first_to_correct' | 'time_sprint' | 'fixed_set';

export default function NewChallenge() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { student } = useStudentAuth();
  const { accepted } = useFriends();

  const preselectFriend = params.get('friend');
  const [format, setFormat] = useState<Format>('first_to_points');
  const [subject, setSubject] = useState<'math' | 'english'>('math');
  const [questionSet, setQuestionSet] = useState('68');
  const [target, setTarget] = useState(100);
  const [duration, setDuration] = useState(300);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (preselectFriend) setSelected(new Set([preselectFriend]));
  }, [preselectFriend]);

  // Keep target valid when format changes
  useEffect(() => {
    const opts = FORMAT_TARGETS[format];
    if (opts && !opts.includes(target)) setTarget(opts[0]);
  }, [format, target]);

  // Default question_set sensible per subject
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
    else if (next.size < 4) next.add(id); // host + 4 = 5 max
    else toast.error('Max 5 players including you');
    setSelected(next);
  };

  const handleCreate = async () => {
    if (!student) return;
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
    navigate(`/practice/challenges/${id}/lobby`);
  };

  return (
    <div className="container max-w-2xl py-6 space-y-5">
      <header className="flex items-center gap-3">
        <Swords className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">New challenge</h1>
      </header>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(FORMAT_LABELS) as Format[]).map((f) => (
                <Button
                  key={f}
                  variant={format === f ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormat(f)}
                  className="h-auto py-3 flex flex-col items-start"
                >
                  <span className="font-semibold">{FORMAT_LABELS[f]}</span>
                </Button>
              ))}
            </div>
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

          <Button className="w-full" size="lg" onClick={handleCreate} disabled={creating || selected.size === 0}>
            {creating ? 'Creating…' : 'Create challenge'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
