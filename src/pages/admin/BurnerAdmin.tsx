import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Flame, Copy, RefreshCw, Trash2, Clock } from 'lucide-react';
import {
  listBurners,
  createBurner,
  burnBurner,
  type BurnerAccount,
} from '@/lib/burnerAdmin';

const TTL_OPTIONS = [
  { value: '15', label: '15 minutes' },
  { value: '60', label: '1 hour' },
  { value: '240', label: '4 hours' },
  { value: '1440', label: '24 hours' },
];

function timeLeft(expiresAt: string | null, nowMs: number): string {
  if (!expiresAt) return 'expired';
  const diff = Date.parse(expiresAt) - nowMs;
  if (diff <= 0) return 'expired';
  const mins = Math.floor(diff / 60000);
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m left`;
  if (mins >= 1) return `${mins}m left`;
  return `${Math.floor(diff / 1000)}s left`;
}

export default function BurnerAdmin() {
  const { toast } = useToast();
  const [burners, setBurners] = useState<BurnerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [ttl, setTtl] = useState('60');
  const [label, setLabel] = useState('');
  const [fresh, setFresh] = useState<{ email: string; password: string; expires_at: string | null } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const refresh = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await listBurners();
      setBurners(res.burners ?? []);
    } catch (e: any) {
      toast({ title: 'Could not load burner accounts', description: e?.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const t = setInterval(() => refresh(true), 60_000);
    return () => clearInterval(t);
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await createBurner(parseInt(ttl, 10), label.trim() || undefined);
      setFresh({
        email: res.burner.email,
        password: res.burner.password,
        expires_at: res.burner.expires_at,
      });
      setLabel('');
      toast({ title: 'Burner admin created', description: 'Copy the password now — it is shown only once.' });
      refresh(true);
    } catch (e: any) {
      toast({ title: 'Could not create burner', description: e?.message, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleBurn = async (id: string) => {
    try {
      await burnBurner(id);
      setBurners((prev) => prev.filter((b) => b.id !== id));
      setFresh((f) => f);
      toast({ title: 'Whoosh', description: 'The burner account is gone.' });
    } catch (e: any) {
      toast({ title: 'Could not delete', description: e?.message, variant: 'destructive' });
    }
  };

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${what} copied` });
    } catch {
      toast({ title: 'Copy failed', description: text, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <Flame className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Burner Admin</h1>
          <p className="text-sm text-muted-foreground">
            Throwaway admin logins that delete themselves when the time runs out.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Create one</CardTitle>
          <CardDescription>
            Full admin access, then it disappears — account and access both removed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Lifetime</Label>
              <Select value={ttl} onValueChange={setTtl}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTL_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. testing sprint page"
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={creating} className="gap-2">
            <Flame className="h-4 w-4" />
            {creating ? 'Creating…' : 'Create burner admin'}
          </Button>
        </CardContent>
      </Card>

      {fresh && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-lg">Login details</CardTitle>
            <CardDescription>Shown once. Sign in at /login on the Admin tab.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { k: 'Email', v: fresh.email },
              { k: 'Password', v: fresh.password },
            ].map((row) => (
              <div key={row.k} className="flex items-center gap-2">
                <span className="w-20 text-sm text-muted-foreground">{row.k}</span>
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono break-all">{row.v}</code>
                <Button size="icon" variant="outline" onClick={() => copy(row.v, row.k)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> {timeLeft(fresh.expires_at, now)}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg">Live burners</CardTitle>
            <CardDescription>Expired ones are removed automatically.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refresh()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : burners.length === 0 ? (
            <p className="text-sm text-muted-foreground">No burner accounts right now.</p>
          ) : (
            <div className="space-y-2">
              {burners.map((b) => (
                <div key={b.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm truncate">{b.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {timeLeft(b.expires_at, now)}{b.label ? ` · ${b.label}` : ''}
                    </p>
                  </div>
                  {b.is_self && <Badge variant="secondary">this session</Badge>}
                  <Button variant="destructive" size="sm" className="gap-2" onClick={() => handleBurn(b.id)}>
                    <Trash2 className="h-4 w-4" /> Burn now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
