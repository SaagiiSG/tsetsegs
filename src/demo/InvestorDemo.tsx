import { usePublicLanguage } from '@/hooks/usePublicLanguage';
import { requiresDemoSignup } from '@/lib/publicLanguage';
import { demoRole } from '@/lib/educatorApplications';
import { useEffect, useRef, useState } from 'react';
import { Home, BookOpen, Zap, BarChart3, Trophy, PlayCircle, Users, CalendarCheck, Megaphone, Plus, ArrowRight, Clock, LogOut, Moon, Sun, Flame } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { MathText } from '@/components/MathText';
import { DailyRing } from '@/components/student/dashboard/DailyRing';
import { SatSimulationIsland } from '@/components/student/dashboard/StudentSatSimulationCard';
import { RoadmapPreview } from '@/portal/RoadmapPreview';
import { AdminBackgroundPaths } from '@/components/ui/background-paths';
import { buildSimHistory } from '@/lib/satSimulation';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { demoQuestions, demoStudents, demoLessons, demoHistory, type DemoState } from './demoData';
import { useDemoSession } from './useDemoSession';
import { BrandMark } from '@/components/BrandMark';

type Role = 'student' | 'teacher' | 'admin';
const navs = {
  student: [['Home', Home], ['Practice', BookOpen], ['Speed', Zap], ['Analytics', BarChart3], ['Leaderboard', Trophy], ['Roadmap', PlayCircle]],
  teacher: [['Overview', Home], ['Classes', Users], ['Attendance', CalendarCheck], ['Analytics', BarChart3], ['Announcements', Megaphone]],
  admin: [['Overview', Home], ['Classes', Users], ['Students', Users], ['Analytics', BarChart3], ['Announcements', Megaphone]],
} as const;
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <div className={`admin-glass-card admin-glass-neutral border rounded-3xl p-5 ${className}`}>{children}</div>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <Panel><p className="text-xs text-muted-foreground">{label}</p><p className="font-mono text-3xl mt-2">{value}</p></Panel>; }
function Performance({ days = 14 }: { days?: number }) { return <div className="h-64 w-full"><ResponsiveContainer><LineChart data={demoHistory.slice(-days)}><CartesianGrid stroke="hsl(var(--border))" vertical={false}/><XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))' }}/><YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }}/><Tooltip contentStyle={{ background: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}/><Line name="Accuracy % · sample" dataKey="accuracy" stroke="hsl(var(--primary))" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>; }

export default function InvestorDemo() {
  const demo = useDemoSession();
  const { lang, text: translate } = usePublicLanguage();
  const signupMode = new URLSearchParams(window.location.search).get('signup');
  const [signupPrompt, setSignupPrompt] = useState(false);
  const autoStarted = useRef(false);
  useEffect(() => {
    if ((signupMode !== 'practice' && new URLSearchParams(window.location.search).get('preview') !== 'educator') || demo.loading || demo.session || demo.expired || autoStarted.current) return;
    autoStarted.current = true; void demo.start();
  }, [signupMode, demo.loading, demo.session, demo.expired]);
  const { resolvedTheme, setTheme } = useTheme();
  const [role, setRole] = useState<Role>(() => demoRole(new URLSearchParams(window.location.search).get('role')));
  const [page, setPage] = useState(() => demoRole(new URLSearchParams(window.location.search).get('role')) === 'student' ? 'Home' : 'Overview');
  const [dialog, setDialog] = useState<string | null>(null);
  const [history, setHistory] = useState(false);
  const [q, setQ] = useState(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<boolean | null>(null);
  const [explanation, setExplanation] = useState(false);
  const [days, setDays] = useState(14);
  const [text, setText] = useState('');
  const [goal, setGoal] = useState({ speed: 2, hard: 5, medium: 10 });
  const [speedActive, setSpeedActive] = useState(false);
  const [speedSeconds, setSpeedSeconds] = useState(90);
  const started = useRef(Date.now());
  useEffect(() => { const cls = role === 'student' ? ['student-portal', 'customer-student-portal'] : ['admin-theme']; document.body.classList.add(...cls); return () => document.body.classList.remove(...cls); }, [role]);
  useEffect(() => {
    if (!speedActive) return;
    const interval = window.setInterval(() => setSpeedSeconds(s => { if (s <= 1) { setSpeedActive(false); return 0; } return s - 1; }), 1000);
    return () => clearInterval(interval);
  }, [speedActive]);
  const resetQuestion = (index: number) => { setQ(index); setAnswer(null); setResult(null); setExplanation(false); started.current = Date.now(); };
  const go = (next: string) => { if (requiresDemoSignup(signupMode, next)) { setSignupPrompt(true); return; } setPage(next); resetQuestion(0); setSpeedActive(false); };
  const state = demo.session?.state;
  const correct = state?.attempts.filter(a => a.correct).length ?? 0;
  const total = state?.attempts.length ?? 0;
  const completed = ['exponents', 'linear', ...(state?.completedVideos ?? [])];
  const simulation = buildSimHistory(Array.from({ length: 44 }, (_, i) => ({ question_id: `sample-${i}`, is_correct: i % 7 !== 0, time_spent_seconds: 80 + i % 10, difficulty_level: i % 2 ? 'hard' : 'medium' })))[0];
  const submitAnswer = async () => {
    if (requiresDemoSignup(signupMode, 'attempt')) { setSignupPrompt(true); return; }
    if (!answer) return;
    const ok = await demo.action('attempt', { question: String(q), answer, seconds: String(Math.min(3600, Math.max(1, Math.round((Date.now() - started.current) / 1000)))) });
    if (ok) setResult(['B', 'C', 'A', 'D', 'B', 'C'][q] === answer);
  };
  const roster = (attendance = false) => <Table><TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Accuracy</TableHead><TableHead>Rank</TableHead><TableHead>{attendance ? 'Attendance' : 'Points'}</TableHead></TableRow></TableHeader><TableBody>{demoStudents.map(s => <TableRow key={s.name}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.accuracy}%</TableCell><TableCell><Badge variant="outline">{s.tier}</Badge></TableCell><TableCell>{attendance ? <Button disabled={demo.busy} variant="outline" size="sm" onClick={() => { const current = state?.attendance[s.name] ?? 'present'; void demo.action('attendance', { student: s.name, status: current === 'present' ? 'late' : current === 'late' ? 'absent' : 'present' }); }}>{state?.attendance[s.name] ?? 'present'}</Button> : s.points + (s.name === 'Alex Morgan' ? correct * 10 : 0)}</TableCell></TableRow>)}</TableBody></Table>;
  const practice = <Panel className="max-w-4xl mx-auto"><div className="flex justify-between gap-3 mb-6"><Badge variant="outline">DEMO{String(q + 1).padStart(3, '0')} · {demoQuestions[q].topic}</Badge>{speedActive && <span className="font-mono">{speedSeconds}s</span>}</div><div className="text-lg leading-relaxed mb-6"><MathText text={demoQuestions[q].text}/></div><div className="grid gap-3 sm:grid-cols-2">{demoQuestions[q].options.map((option, i) => { const letter = String.fromCharCode(65 + i); return <Button key={letter} variant={answer === letter ? 'default' : 'outline'} disabled={result !== null || demo.busy} className="h-auto min-h-14 justify-start whitespace-normal text-left" onClick={() => setAnswer(letter)}><span className="font-mono mr-2">{letter}</span><MathText text={option}/></Button>; })}</div><div className="flex gap-3 mt-6 flex-wrap"><Button disabled={!answer || demo.busy || result !== null} onClick={() => void submitAnswer()}>Check answer</Button><Button variant="outline" onClick={() => setExplanation(!explanation)}>{explanation ? 'Hide explanation' : 'Show explanation'}</Button>{result !== null && <Button variant="outline" onClick={() => resetQuestion((q + 1) % demoQuestions.length)}>Next question<ArrowRight className="h-4 w-4"/></Button>}</div>{result !== null && <p role="status" className="mt-4 font-medium">{result ? 'Correct! Your attempt has been saved.' : 'Incorrect. Try the next question or review the explanation.'}</p>}{explanation && <div className="mt-5 border-t pt-5"><MathText text={demoQuestions[q].explanation}/></div>}</Panel>;

  if (!state) return <main className="min-h-screen bg-background flex items-center justify-center p-6"><div className="w-full max-w-xl space-y-6"><p className="text-sm font-semibold">flowersos</p><h1 className="text-3xl font-chillax font-semibold">{demo.expired ? 'Your demo has ended' : 'FlowersOS investor demo'}</h1><p className="text-muted-foreground">Explore the student, teacher and center admin experiences with fictional sample progress. Your changes are saved in an isolated session for 15 minutes, then automatically deleted.</p><div className="flex gap-2 flex-wrap">{['Student', 'Teacher', 'Center admin', '15 minutes'].map(t => <Badge key={t} variant="outline">{t}</Badge>)}</div>{demo.error && <p role="alert" className="text-destructive">{demo.error}</p>}<Button size="lg" disabled={demo.loading || demo.busy} onClick={() => void demo.start()}>{demo.loading ? 'Loading…' : demo.busy ? 'Starting…' : demo.expired ? 'Start a fresh demo' : 'Start demo'}<ArrowRight className="h-4 w-4"/></Button><p className="text-xs text-muted-foreground">No account needed. No real customer data. Sample analytics are not AI-generated.</p></div></main>;

__SHELL__
    <Dialog open={signupPrompt} onOpenChange={setSignupPrompt}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>{translate('Дасгаллахын тулд бүртгүүлнэ үү', 'Sign up to start practicing')}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{translate('Бүртгэлийн хүсэлт илгээнэ үү. Багш баталгаажуулсны дараа дасгаллах эрх нээгдэнэ. Бие даан суралцах хэсэг удахгүй нээгдэнэ.', 'Send a signup request. Practice access opens after teacher approval; the solo student area is coming soon.')}</p><Button asChild><a href={`/student-register?lang=${lang}`}>{translate('Бүртгүүлэх', 'Sign up')}<ArrowRight className="h-4 w-4"/></a></Button><Button asChild variant="outline"><a href={`/practice?lang=${lang}`}>{translate('Бүртгэлтэй юу? Нэвтрэх', 'Already have an account? Sign in')}</a></Button><Button variant="ghost" onClick={() => setSignupPrompt(false)}>{translate('Үргэлжлүүлэн үзэх', 'Keep exploring')}</Button></DialogContent></Dialog>
    <Sheet open={history} onOpenChange={setHistory}><SheetContent className="overflow-y-auto"><SheetHeader><SheetTitle>Practice history</SheetTitle></SheetHeader><div className="space-y-4 mt-6">{[...state.attempts].reverse().map((a,i) => <div key={i} className="border-b pb-3"><p className="font-medium">DEMO{a.question + 1} · {a.correct ? 'Correct' : 'Incorrect'}</p><p className="text-xs text-muted-foreground">{a.seconds}s · Saved this demo</p></div>)}{!total && <p className="text-sm text-muted-foreground">No new attempts in this demo yet.</p>}{demoHistory.slice(-3).reverse().map(h => <div key={h.day} className="border-b pb-3"><p>{h.accuracy}% accuracy · {h.seconds}s / question</p><p className="text-xs text-muted-foreground">{h.day} · sample session</p></div>)}</div></SheetContent></Sheet>
    <Dialog open={!!dialog} onOpenChange={open => { if (!open) setDialog(null); }}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>{dialog === 'streak' ? 'Your streak' : dialog === 'rings' ? 'Daily ring history' : dialog === 'goals' ? 'Daily goals' : dialog === 'class' ? 'Create class' : demoLessons.find(l => l.id === dialog)?.name}</DialogTitle></DialogHeader>{dialog === 'streak' && <div className="space-y-4"><p className="font-mono text-4xl">12 days</p><p>2 streak freezes available · sample rewards</p><Progress value={12 / 14 * 100}/><p className="text-sm text-muted-foreground">Next reward: 14-day streak badge in 2 days.</p></div>}{dialog === 'rings' && <Performance days={7}/>} {dialog === 'goals' && <div className="space-y-4">{(['speed','hard','medium'] as const).map(key => <div key={key}><Label htmlFor={`goal-${key}`} className="capitalize">{key}</Label><Input id={`goal-${key}`} type="number" min={1} max={99} value={goal[key]} onChange={e => setGoal({...goal,[key]: Number(e.target.value)})}/></div>)}<Button disabled={demo.busy} onClick={async () => { if (await demo.action('goals', goal)) setDialog(null); }}>Save goals</Button></div>}{dialog === 'class' && <div className="space-y-4"><Label htmlFor="class-name">Class name</Label><Input id="class-name" maxLength={60} value={text} onChange={e => setText(e.target.value)}/><Button disabled={!text.trim() || demo.busy} onClick={async () => { if (await demo.action('class',{name:text})) setDialog(null); }}>Create class</Button></div>}{demoLessons.filter(l => l.id === dialog).map(l => <div key={l.id} className="space-y-5"><div className="text-2xl"><MathText text={l.math}/></div><p>{l.text}</p><MathText text={l.example}/><Button disabled={demo.busy} onClick={async () => { if (await demo.action('video',{id:l.id})) setDialog(null); }}>Mark complete</Button></div>)}</DialogContent></Dialog>
  </div>;
}

function DemoRanks({ state }: { state: DemoState }) {
  const extra = state.attempts.filter(a => a.correct).length * 10;
  return <><TabsContent value="sprint"><p className="text-sm text-muted-foreground py-4">Sprint 3 · 5 days remaining · sample standings</p><RankTable extra={extra}/></TabsContent><TabsContent value="all"><p className="text-sm text-muted-foreground py-4">All-time · sample standings + demo points</p><RankTable extra={extra}/></TabsContent><TabsContent value="position"><div className="py-8 space-y-3"><p className="font-mono text-4xl">#2 · Gold</p><p>{2840+extra} points · {Math.max(0, 3120-2840-extra)} points to first place</p></div></TabsContent><TabsContent value="history">{['Sprint 1 · Bronze → Silver · #3','Sprint 2 · Silver → Gold · #2'].map(s => <p className="py-4 border-b" key={s}>{s}<span className="text-xs text-muted-foreground ml-2">sample</span></p>)}</TabsContent></>;
}
function RankTable({ extra }: { extra: number }) { return <Table><TableHeader><TableRow><TableHead>Position</TableHead><TableHead>Student</TableHead><TableHead>Tier</TableHead><TableHead>Points</TableHead></TableRow></TableHeader><TableBody>{demoStudents.map(s => ({...s, points:s.points+(s.name==='Alex Morgan'?extra:0)})).sort((a,b) => b.points-a.points).map((s,i) => <TableRow key={s.name}><TableCell>#{i+1}</TableCell><TableCell>{s.name}{s.name==='Alex Morgan'?' (you)':''}</TableCell><TableCell>{s.tier}</TableCell><TableCell className="font-mono">{s.points}</TableCell></TableRow>)}</TableBody></Table>; }