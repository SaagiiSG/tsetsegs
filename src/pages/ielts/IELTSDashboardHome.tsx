import { useStudentAuth } from '@/contexts/StudentAuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Headphones, PenLine, Mic, Sparkles, Languages } from 'lucide-react';

export default function IELTSDashboardHome() {
  const { student } = useStudentAuth();
  const ieltsLinked =
    student?.linked_students?.find((s) => s.course_type === 'IELTS') ??
    student?.linked_student ??
    null;
  const firstName = ieltsLinked?.first_name ?? 'there';

  const skills = [
    { icon: BookOpen, label: 'Reading', desc: 'Academic & General passages with timed practice' },
    { icon: Headphones, label: 'Listening', desc: 'Section-by-section drills with native audio' },
    { icon: PenLine, label: 'Writing', desc: 'Task 1 & 2 with AI-assisted feedback' },
    { icon: Mic, label: 'Speaking', desc: 'Cue cards and mock interviews' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Welcome */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Languages className="h-3.5 w-3.5" />
          IELTS Prep
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Welcome, {firstName}
        </h1>
        <p className="text-muted-foreground text-sm md:text-base">
          Your IELTS prep portal is just getting started. Your teacher will share class
          materials here as practice modules become available.
        </p>
      </div>

      {/* Coming soon panel */}
      <Card className="border-2 border-dashed">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle>What's coming</CardTitle>
          </div>
          <CardDescription>
            We're building out the IELTS practice experience. Here's what to expect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {skills.map((s) => (
              <div
                key={s.label}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <s.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{s.label}</h3>
                    <Badge variant="secondary" className="text-[9px] uppercase">
                      Soon
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Class info */}
      {ieltsLinked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your class</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">
                {ieltsLinked.first_name} {ieltsLinked.last_name ?? ''}
              </p>
            </div>
            {ieltsLinked.school_name && (
              <div>
                <p className="text-xs text-muted-foreground">School</p>
                <p className="font-medium">{ieltsLinked.school_name}</p>
              </div>
            )}
            {ieltsLinked.grade && (
              <div>
                <p className="text-xs text-muted-foreground">Grade</p>
                <p className="font-medium">{ieltsLinked.grade}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
