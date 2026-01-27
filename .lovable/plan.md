

# Review Page Redesign Plan

## Overview
This plan redesigns the `/practice/review` page with:
1. **Consistent header** matching other practice pages
2. **Math/English toggle** as a button group
3. **70/30 split layout** with analytics on left, history on right
4. **Right-side drawer** for scheduled session builder

---

## New Layout Design

```text
+----------------------------------------------------------------------+
| HEADER                                                                |
| Review · Spaced Repetition                                            |
|                                                                        |
| [Math] [English]  ← Button group toggle                               |
+----------------------------------------------------------------------+
|                                                                        |
| LEFT SECTION (70%)                               | RIGHT (30%)        |
| +--------------------------------------------+   |                    |
| | TOP ROW (50/50 split)                      |   | HISTORY            |
| | +-------------------+ +------------------+ |   | (full height)      |
| | | SCHEDULED TO      | | MISTAKES NOT     | |   |                    |
| | | SOLVE             | | CORRECTED        | |   | +----------------+ |
| | |                   | |                  | |   | | Box-style      | |
| | | 12 questions      | | 8 questions      | |   | | history items  | |
| | | ← Click to open   | |                  | |   | |                | |
| | |   drawer          | |                  | |   | | #6801 ✓        | |
| | +-------------------+ +------------------+ |   | | Jan 25         | |
| +--------------------------------------------+   | |                | |
|                                                   | | #ENG0042 ✗    | |
| +-----------------------------------------------+ | | Jan 24         | |
| | RADAR CHART + AREA BREAKDOWN                  | | |                | |
| | +----------------------------+ +------------+ | | | ...            | |
| | | Mastery Radar Chart        | | Areas      | | | +----------------+ |
| | | (same as dashboard)        | |            | | |                    |
| | |                            | | Algebra: 3 | | |                    |
| | |                            | | Adv: 2     | | |                    |
| | |                            | | Geo: 1     | | |                    |
| | |                            | | Prob: 2    | | |                    |
| | +----------------------------+ +------------+ | |                    |
| +-----------------------------------------------+ |                    |
+---------------------------------------------------+--------------------+
```

---

## Implementation Steps

### Step 1: Page Header with Subject Toggle

Consistent with other practice pages, using a button group:

```tsx
{/* Header */}
<div className="space-y-4">
  <div>
    <h1 className="text-2xl font-bold flex items-center gap-2">
      <Brain className="h-6 w-6 text-orange-500" />
      Review
    </h1>
    <p className="text-muted-foreground">
      Spaced repetition to strengthen memory
    </p>
  </div>
  
  {/* Subject Toggle */}
  <div className="flex rounded-lg border bg-muted/50 p-1 w-fit">
    <Button
      variant={subject === 'math' ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setSubject('math')}
      className="gap-2"
    >
      <Target className="h-4 w-4" />
      Math
    </Button>
    <Button
      variant={subject === 'english' ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setSubject('english')}
      className="gap-2"
    >
      <FileText className="h-4 w-4" />
      English
    </Button>
  </div>
</div>
```

### Step 2: Data Fetching for Review Queue by Subject

Extend the existing query to filter by subject and include category data:

```tsx
const { data: reviewQueue, isLoading } = useQuery({
  queryKey: ['review-queue', student?.id, subject],
  queryFn: async () => {
    if (!student) return { dueNow: [], scheduled: [], byCategory: {} };
    
    const { data, error } = await supabase
      .from('student_review_queue')
      .select(`
        *,
        question:questions(
          id, question_id, subject,
          category:question_categories(id, name)
        )
      `)
      .eq('student_account_id', student.id);
    
    if (error) throw error;
    
    // Filter by subject
    const filtered = data?.filter(r => 
      r.question?.subject?.toLowerCase() === subject
    ) || [];
    
    const now = new Date();
    const dueNow = filtered.filter(r => new Date(r.next_review_at) <= now);
    const scheduled = filtered.filter(r => new Date(r.next_review_at) > now);
    
    // Group by category for breakdown
    const byCategory: Record<string, number> = {};
    dueNow.forEach(r => {
      const catName = r.question?.category?.name || 'Uncategorized';
      byCategory[catName] = (byCategory[catName] || 0) + 1;
    });
    
    return { dueNow, scheduled, byCategory };
  },
  enabled: !!student
});
```

### Step 3: Fetch Incorrect Attempts (Mistakes Not Corrected)

Query attempts where the student got it wrong and never corrected:

```tsx
const { data: mistakesData } = useQuery({
  queryKey: ['uncorrected-mistakes', student?.id, subject],
  queryFn: async () => {
    if (!student) return { count: 0, byCategory: {} };
    
    // Get all attempts
    const { data: attempts } = await supabase
      .from('student_attempts')
      .select(`
        question_id, is_correct,
        questions!inner(subject, category:question_categories(name))
      `)
      .eq('student_account_id', student.id);
    
    // Group by question, check if ever correct
    const questionResults = new Map<string, { 
      everCorrect: boolean; 
      category: string;
      subject: string;
    }>();
    
    attempts?.forEach(a => {
      const existing = questionResults.get(a.question_id);
      if (!existing) {
        questionResults.set(a.question_id, {
          everCorrect: a.is_correct,
          category: a.questions?.category?.name || 'Uncategorized',
          subject: a.questions?.subject || 'math'
        });
      } else if (a.is_correct) {
        existing.everCorrect = true;
      }
    });
    
    // Filter to subject and never correct
    const mistakes = Array.from(questionResults.entries())
      .filter(([_, v]) => !v.everCorrect && v.subject === subject);
    
    // Group by category
    const byCategory: Record<string, number> = {};
    mistakes.forEach(([_, v]) => {
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
    });
    
    return { count: mistakes.length, byCategory };
  },
  enabled: !!student
});
```

### Step 4: Review History Query

Fetch recent review attempts for the history sidebar:

```tsx
const { data: reviewHistory } = useQuery({
  queryKey: ['review-history', student?.id, subject],
  queryFn: async () => {
    if (!student) return [];
    
    const { data } = await supabase
      .from('student_attempts')
      .select(`
        id, question_id, is_correct, attempted_at,
        questions!inner(question_id, subject)
      `)
      .eq('student_account_id', student.id)
      .order('attempted_at', { ascending: false })
      .limit(50);
    
    // Filter by subject
    return data?.filter(a => 
      a.questions?.subject?.toLowerCase() === subject
    ).slice(0, 20) || [];
  },
  enabled: !!student
});
```

### Step 5: Top Row - Stat Boxes (50/50 split)

Two clickable cards side by side:

```tsx
<div className="grid grid-cols-2 gap-4">
  {/* Scheduled to Solve - Clickable */}
  <Card 
    className="cursor-pointer hover:border-primary/50 transition-colors bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20"
    onClick={() => setDrawerOpen(true)}
  >
    <CardContent className="p-5">
      <div className="flex items-center gap-2 text-blue-600 mb-2">
        <Calendar className="h-5 w-5" />
        <span className="font-medium">Scheduled</span>
      </div>
      <p className="text-4xl font-bold">{reviewQueue?.scheduled?.length || 0}</p>
      <p className="text-sm text-muted-foreground mt-1">
        questions to review
      </p>
      <p className="text-xs text-primary mt-2 flex items-center gap-1">
        <Clock className="h-3 w-3" /> Tap to start session
      </p>
    </CardContent>
  </Card>

  {/* Mistakes Not Corrected */}
  <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
    <CardContent className="p-5">
      <div className="flex items-center gap-2 text-red-600 mb-2">
        <AlertCircle className="h-5 w-5" />
        <span className="font-medium">Uncorrected</span>
      </div>
      <p className="text-4xl font-bold">{mistakesData?.count || 0}</p>
      <p className="text-sm text-muted-foreground mt-1">
        mistakes to fix
      </p>
    </CardContent>
  </Card>
</div>
```

### Step 6: Radar Chart with Category Breakdown

Reuse dashboard's radar chart logic with area breakdown on the right:

```tsx
<Card className="mt-4">
  <CardHeader className="pb-2">
    <CardTitle className="text-base flex items-center gap-2">
      <Brain className="h-4 w-4" />
      Weakness Areas
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Radar Chart - Left */}
      <div className="flex-1">
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <RadarChart data={masteryData || []} outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="area" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
            <Radar
              name="Mastery"
              dataKey="score"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.4}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
          </RadarChart>
        </ChartContainer>
      </div>

      {/* Area Breakdown - Right */}
      <div className="lg:w-48 border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-4">
        <h4 className="font-medium text-sm mb-3">Mistakes by Area</h4>
        <div className="space-y-3">
          {Object.entries(reviewQueue?.byCategory || {}).map(([cat, count]) => (
            <div key={cat} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground truncate">{cat}</span>
              <Badge variant="secondary">{count}</Badge>
            </div>
          ))}
          {Object.keys(reviewQueue?.byCategory || {}).length === 0 && (
            <p className="text-sm text-muted-foreground">No pending reviews</p>
          )}
        </div>
      </div>
    </div>
  </CardContent>
</Card>
```

### Step 7: History Sidebar (30% width, screen height)

Box-style history items in a scrollable area:

```tsx
{/* Right Column - History */}
<Card className="h-[calc(100vh-200px)] flex flex-col">
  <CardHeader className="pb-2 flex-shrink-0">
    <CardTitle className="text-base flex items-center gap-2">
      <History className="h-4 w-4" />
      Review History
    </CardTitle>
  </CardHeader>
  <CardContent className="flex-1 overflow-hidden p-2">
    <ScrollArea className="h-full">
      <div className="space-y-2 pr-2">
        {reviewHistory?.map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
            onClick={() => navigate(`/practice/question/${item.question_id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.is_correct ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}
                <span className="font-mono font-medium text-sm">
                  #{item.questions?.question_id}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(item.attempted_at), { addSuffix: true })}
              </span>
            </div>
          </div>
        ))}
        {(!reviewHistory || reviewHistory.length === 0) && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No review history yet</p>
          </div>
        )}
      </div>
    </ScrollArea>
  </CardContent>
</Card>
```

### Step 8: Scheduled Session Builder Drawer

Right-side drawer with session configuration:

```tsx
const [drawerOpen, setDrawerOpen] = useState(false);
const [sessionQuestionCount, setSessionQuestionCount] = useState(10);

<Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
  <DrawerContent className="h-full w-[400px] max-w-[90vw] ml-auto rounded-l-[10px] rounded-t-none">
    <DrawerHeader>
      <DrawerTitle>Start Review Session</DrawerTitle>
      <DrawerDescription>
        Configure your scheduled review session
      </DrawerDescription>
    </DrawerHeader>
    
    <div className="p-6 space-y-6">
      {/* Available Questions */}
      <div className="text-center p-4 rounded-lg bg-primary/10">
        <p className="text-3xl font-bold text-primary">
          {reviewQueue?.dueNow?.length || 0}
        </p>
        <p className="text-sm text-muted-foreground">questions due now</p>
      </div>
      
      {/* Question Count Slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label>Questions to Review</Label>
          <span className="font-mono font-bold text-primary">
            {sessionQuestionCount}
          </span>
        </div>
        <Slider
          value={[sessionQuestionCount]}
          onValueChange={([val]) => setSessionQuestionCount(val)}
          min={5}
          max={Math.max(5, reviewQueue?.dueNow?.length || 20)}
          step={5}
        />
      </div>
      
      {/* Category Filter Badges */}
      <div>
        <Label className="mb-2 block">Focus Areas</Label>
        <div className="flex flex-wrap gap-2">
          {Object.entries(reviewQueue?.byCategory || {}).map(([cat, count]) => (
            <Badge 
              key={cat} 
              variant="outline" 
              className="cursor-pointer hover:bg-primary/10"
            >
              {cat} ({count})
            </Badge>
          ))}
        </div>
      </div>
    </div>
    
    <DrawerFooter>
      <Button 
        onClick={startReviewSession}
        disabled={!reviewQueue?.dueNow?.length}
        className="w-full"
      >
        <Zap className="h-4 w-4 mr-2" />
        Start Review ({sessionQuestionCount} questions)
      </Button>
      <DrawerClose asChild>
        <Button variant="outline">Cancel</Button>
      </DrawerClose>
    </DrawerFooter>
  </DrawerContent>
</Drawer>
```

### Step 9: Session Navigation

```tsx
const startReviewSession = () => {
  logActivity('review_session_start', { 
    subject,
    questionCount: sessionQuestionCount 
  });
  
  // Navigate to first due question or dedicated review route
  const firstQuestion = reviewQueue?.dueNow?.[0];
  if (firstQuestion) {
    navigate(`/practice/question/${firstQuestion.question_id}?mode=review`);
  }
  setDrawerOpen(false);
};
```

---

## Component Structure

```text
StudentReview.tsx
├── State
│   ├── subject: 'math' | 'english'
│   ├── drawerOpen: boolean
│   └── sessionQuestionCount: number
│
├── Queries
│   ├── reviewQueue (due now + scheduled + byCategory)
│   ├── mistakesData (uncorrected mistakes)
│   ├── reviewHistory (recent attempts)
│   └── masteryData (radar chart - reused from dashboard)
│
├── Layout
│   ├── Header + Subject Toggle
│   └── 70/30 Grid
│       ├── Left (70%)
│       │   ├── Top Row (50/50)
│       │   │   ├── Scheduled Box (clickable → drawer)
│       │   │   └── Mistakes Box
│       │   └── Radar Chart + Area Breakdown
│       └── Right (30%)
│           └── History ScrollArea (screen height)
│
└── Drawer (right-side session builder)
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/student/StudentReview.tsx` | Complete redesign with new layout |

---

## Technical Details

### Responsive Behavior
- On mobile: Stack 70/30 vertically (left section first, then history)
- History section gets fixed height on mobile instead of screen height

```tsx
<div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
  {/* Left 70% */}
  <div className="lg:col-span-7 space-y-4">
    {/* ... */}
  </div>
  
  {/* Right 30% */}
  <div className="lg:col-span-3">
    <Card className="h-[400px] lg:h-[calc(100vh-200px)]">
      {/* History */}
    </Card>
  </div>
</div>
```

### Imports Required
```tsx
import {
  Brain, Target, FileText, Calendar, Clock, AlertCircle,
  CheckCircle2, XCircle, History, Zap, Loader2
} from 'lucide-react';
import {
  Drawer, DrawerContent, DrawerHeader, DrawerTitle,
  DrawerDescription, DrawerFooter, DrawerClose
} from '@/components/ui/drawer';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
```

### Chart Configuration
```tsx
const chartConfig = {
  mastery: {
    label: "Mastery",
    color: "hsl(var(--primary))",
  },
};
```

