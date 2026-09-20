import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BatchesView } from '@/components/admin/BatchesView';
import { Globe, GraduationCap, Users, Search, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface IntlStudentRow {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string | null;
  school: string | null;
  grade: string | null;
  batch_name: string | null;
  created_at: string | null;
  hasAccount: boolean;
  accountActive: boolean;
  lastLogin: string | null;
}

const normalizePhone = (p: string | null) => {
  const digits = (p || '').replace(/\D/g, '');
  return digits.length > 8 ? digits.slice(-8) : digits;
};

export default function InternationalView() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<IntlStudentRow[]>([]);
  const [batchCount, setBatchCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data: batches } = await supabase
        .from('batches')
        .select('id, batch_name')
        .eq('is_international', true);

      const batchIds = (batches || []).map((b) => b.id);
      setBatchCount(batchIds.length);

      if (batchIds.length === 0) {
        setStudents([]);
        return;
      }

      const batchNames = new Map((batches || []).map((b) => [b.id, b.batch_name as string]));

      const [{ data: studentRows }, { data: accountRows }] = await Promise.all([
        supabase
          .from('students')
          .select('id, first_name, last_name, phone, school_name, grade, batch_id, created_at')
          .in('batch_id', batchIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('student_accounts')
          .select('phone_number, is_active, last_login')
          .eq('cohort', 'intl'),
      ]);

      const accountsByPhone = new Map(
        (accountRows || []).map((a: any) => [normalizePhone(a.phone_number), a]),
      );

      setStudents(
        (studentRows || []).map((s: any) => {
          const account = accountsByPhone.get(normalizePhone(s.phone));
          return {
            id: s.id,
            first_name: s.first_name,
            last_name: s.last_name,
            phone: s.phone,
            school: s.school_name,
            grade: s.grade,
            batch_name: batchNames.get(s.batch_id) || null,
            created_at: s.created_at,
            hasAccount: !!account,
            accountActive: !!account?.is_active,
            lastLogin: account?.last_login || null,
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      `${s.first_name} ${s.last_name || ''}`.toLowerCase().includes(q) ||
      (s.phone || '').includes(search.replace(/\s/g, '')) ||
      (s.batch_name || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5">
          <Globe className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">International</h1>
          <p className="text-muted-foreground">
            Separate world for international classes — hidden from all other admin pages.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Batches</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{batchCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{students.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">With accounts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {students.filter((s) => s.hasAccount).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="students">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4" /> Students
          </TabsTrigger>
          <TabsTrigger value="batches" className="gap-2">
            <GraduationCap className="h-4 w-4" /> Batches
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>International Students</CardTitle>
              <CardDescription>
                Showing {filtered.length} of {students.length} student
                {students.length === 1 ? '' : 's'}
              </CardDescription>
              <div className="relative pt-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, phone or class..."
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  {batchCount === 0
                    ? 'No international batches yet. Flip a batch to international from its edit screen.'
                    : 'No students match your search.'}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>School / Grade</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Last login</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">
                            {s.first_name} {s.last_name || ''}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{s.phone || '—'}</TableCell>
                          <TableCell className="text-sm">{s.batch_name || '—'}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {[s.school, s.grade].filter(Boolean).join(' · ') || '—'}
                          </TableCell>
                          <TableCell>
                            {!s.hasAccount ? (
                              <Badge variant="outline">No account</Badge>
                            ) : s.accountActive ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive">Disabled</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {s.lastLogin ? format(new Date(s.lastLogin), 'MMM d, HH:mm') : '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/student/${s.id}`)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batches" className="mt-6">
          <BatchesView internationalOnly />
        </TabsContent>
      </Tabs>
    </div>
  );
}
