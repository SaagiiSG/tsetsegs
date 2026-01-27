
# Speed Mode Redesign Plan

## Overview
This plan redesigns the `/practice/speed` page with a modern, analytics-focused layout featuring:
1. **Top Row**: Performance chart (70%) + Last session stats (30%)
2. **Session Builder Island**: Time/question count sliders + category selector
3. **Bottom Row**: Start button + Best score + Session count + Badge placeholder

---

## New Layout Design

```text
+--------------------------------------------------------------------+
|  TOP ROW                                                            |
|  +-------------------------------------------+  +----------------+  |
|  |  AREA CHART (70%)                         |  | LAST SESSION   |  |
|  |  Last week's speed sessions               |  | (30%)          |  |
|  |  AreaChart with:                          |  |                |  |
|  |  - Date on X-axis                         |  |   42s          |  |
|  |  - Time per problem (Y-axis)              |  |      87% acc   |  |
|  |  - Accuracy as secondary line             |  |                |  |
|  +-------------------------------------------+  +----------------+  |
+--------------------------------------------------------------------+
|                                                                      |
|  SESSION BUILDER ISLAND (elevated, rounded container)               |
|  +----------------------------------------------------------------+ |
|  |  TIME SELECTION                                                 | |
|  |  [Slider: 10s ----O-------------------------- 10min]           | |
|  |  Selected: 2 minutes                                            | |
|  |                                                                 | |
|  |  QUESTION COUNT                                                 | |
|  |  [Slider: 5 ------O-------------------------- 50]              | |
|  |  Selected: 15 questions                                         | |
|  |                                                                 | |
|  |  AREA SELECTOR                                                  | |
|  |  +------------------------------------------------------------+ | |
|  |  | Select with Group & Labels                                 | | |
|  |  | - All Categories                                           | | |
|  |  | - Math > Advanced Math, Algebra, Geometry, Problem Solving | | |
|  |  | - English > Craft, Info, Standard English, Expression     | | |
|  |  +------------------------------------------------------------+ | |
|  +----------------------------------------------------------------+ |
+--------------------------------------------------------------------+
|                                                                      |
|  [================== START SESSION ==================]              |
|                                                                      |
|  BOTTOM ROW                                                         |
|  +-------------------+  +-------------------+  +-------------------+ |
|  | Best Score        |  | Sessions          |  | Badge             | |
|  | 95%               |  | 12 total          |  | Coming Soon       | |
|  | 38s avg           |  |                   |  | (placeholder)     | |
|  +-------------------+  +-------------------+  +-------------------+ |
+--------------------------------------------------------------------+
```

---

## Implementation Steps

### Step 1: Fetch Speed Session History

Query the `student_activity_logs` table to get last week's speed session data:

```tsx
const { data: speedHistory } = useQuery({
  queryKey: ['speed-history', student?.id],
  queryFn: async () => {
    const weekAgo = subDays(new Date(), 7);
    
    // Get completed sessions
    const { data: sessions } = await supabase
      .from('student_activity_logs')
      .select('metadata, created_at')
      .eq('student_account_id', student.id)
      .eq('activity_type', 'speed_mode_complete')
      .gte('created_at', weekAgo.toISOString())
      .order('created_at', { ascending: true });
    
    return sessions?.map(s => ({
      date: format(new Date(s.created_at), 'EEE'),
      fullDate: format(new Date(s.created_at), 'MMM d'),
      total: s.metadata.total,
      correct: s.metadata.correct,
      accuracy: s.metadata.total > 0 
        ? Math.round((s.metadata.correct / s.metadata.total) * 100) 
        : 0,
      timePerProblem: s.metadata.timer // seconds per question from session
    })) || [];
  },
  enabled: !!student?.id
});
```

### Step 2: Build Area Chart Component

Using recharts with shadcn ChartContainer:

```tsx
const chartConfig = {
  timePerProblem: { label: "Time/Problem", color: "hsl(var(--primary))" },
  accuracy: { label: "Accuracy", color: "hsl(var(--chart-2))" }
};

<Card className="w-[70%]">
  <CardHeader className="pb-2">
    <CardTitle className="text-base">Last 7 Days Performance</CardTitle>
  </CardHeader>
  <CardContent>
    <ChartContainer config={chartConfig} className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={speedHistory}>
          <defs>
            <linearGradient id="timeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Area 
            type="monotone" 
            dataKey="timePerProblem" 
            stroke="hsl(var(--primary))" 
            strokeWidth={2}
            fill="url(#timeGradient)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  </CardContent>
</Card>
```

### Step 3: Last Session Stats Component

Display the most recent session's key metrics:

```tsx
<Card className="w-[30%] flex flex-col justify-center">
  <CardContent className="p-6 text-center">
    <p className="text-sm text-muted-foreground mb-1">Last Session</p>
    <div className="relative">
      <span className="text-5xl font-bold text-primary">
        {lastSession?.timePerProblem || '--'}
        <span className="text-2xl">s</span>
      </span>
      <span className="absolute top-0 right-0 text-sm text-muted-foreground">
        {lastSession?.accuracy || '--'}% acc
      </span>
    </div>
    <p className="text-xs text-muted-foreground mt-2">
      per problem
    </p>
  </CardContent>
</Card>
```

### Step 4: Session Builder Island

Elevated container with sliders and category selector:

**State Management:**
```tsx
const [sessionDuration, setSessionDuration] = useState(120); // seconds (2 min default)
const [questionCount, setQuestionCount] = useState(15);
const [selectedCategory, setSelectedCategory] = useState<string>('all');
```

**Time Slider (10 seconds to 10 minutes):**
```tsx
<div className="space-y-3">
  <div className="flex justify-between items-center">
    <Label className="text-sm font-medium">Session Duration</Label>
    <span className="text-sm font-mono font-bold text-primary">
      {formatDuration(sessionDuration)}
    </span>
  </div>
  <Slider
    value={[sessionDuration]}
    onValueChange={([val]) => setSessionDuration(val)}
    min={10}
    max={600} // 10 minutes
    step={10}
    className="w-full"
  />
  <div className="flex justify-between text-xs text-muted-foreground">
    <span>10s</span>
    <span>10min</span>
  </div>
</div>
```

**Question Count Slider:**
```tsx
<div className="space-y-3">
  <div className="flex justify-between items-center">
    <Label className="text-sm font-medium">Questions to Solve</Label>
    <span className="text-sm font-mono font-bold text-primary">
      {questionCount} questions
    </span>
  </div>
  <Slider
    value={[questionCount]}
    onValueChange={([val]) => setQuestionCount(val)}
    min={5}
    max={50}
    step={5}
    className="w-full"
  />
  <div className="flex justify-between text-xs text-muted-foreground">
    <span>5</span>
    <span>50</span>
  </div>
</div>
```

**Category Selector with Groups:**
```tsx
<Select value={selectedCategory} onValueChange={setSelectedCategory}>
  <SelectTrigger>
    <SelectValue placeholder="Select category" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Categories (Mixed)</SelectItem>
    
    <SelectGroup>
      <SelectLabel>Math</SelectLabel>
      {mathCategories?.map(cat => (
        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
      ))}
    </SelectGroup>
    
    <SelectGroup>
      <SelectLabel>English</SelectLabel>
      {englishCategories?.map(cat => (
        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
      ))}
    </SelectGroup>
  </SelectContent>
</Select>
```

### Step 5: Bottom Stats Row

Three equal-width cards with best score, session count, and badge placeholder:

```tsx
<div className="grid grid-cols-3 gap-4">
  {/* Best Score */}
  <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-yellow-600 mb-2">
        <Trophy className="h-4 w-4" />
        <span className="font-medium text-sm">Best Score</span>
      </div>
      <p className="text-2xl font-bold">{bestScore?.accuracy || '--'}%</p>
      <p className="text-xs text-muted-foreground">
        {bestScore?.avgTime ? `${bestScore.avgTime}s avg` : 'No sessions yet'}
      </p>
    </CardContent>
  </Card>
  
  {/* Session Count */}
  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-primary mb-2">
        <Zap className="h-4 w-4" />
        <span className="font-medium text-sm">Sessions</span>
      </div>
      <p className="text-2xl font-bold">{totalSessions || '--'}</p>
      <p className="text-xs text-muted-foreground">total completed</p>
    </CardContent>
  </Card>
  
  {/* Badge Placeholder */}
  <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
    <CardContent className="p-4">
      <div className="flex items-center gap-2 text-purple-600 mb-2">
        <Award className="h-4 w-4" />
        <span className="font-medium text-sm">Badge</span>
      </div>
      <p className="text-lg font-bold text-muted-foreground">Coming Soon</p>
      <p className="text-xs text-muted-foreground">Earn badges!</p>
    </CardContent>
  </Card>
</div>
```

### Step 6: Update Navigation to Session

Modify the `startSpeedMode` function to pass new parameters:

```tsx
const startSpeedMode = () => {
  logActivity('speed_mode_start', { 
    duration: sessionDuration,
    questionCount,
    category: selectedCategory 
  });
  
  const params = new URLSearchParams({
    duration: String(sessionDuration),
    questions: String(questionCount),
    category: selectedCategory
  });
  
  navigate(`/practice/speed/session?${params.toString()}`);
};
```

### Step 7: Responsive Layout

Handle mobile/tablet breakpoints:

```tsx
{/* Top Row - stack on mobile */}
<div className="flex flex-col lg:flex-row gap-4">
  <Card className="lg:w-[70%] w-full">...</Card>
  <Card className="lg:w-[30%] w-full">...</Card>
</div>

{/* Bottom Row - 1 col on mobile, 3 cols on desktop */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">...</div>
```

---

## Files to Modify

| File | Action |
|------|--------|
| `src/pages/student/StudentSpeedMode.tsx` | Full redesign with new layout |
| `src/pages/student/StudentSpeedSession.tsx` | Update to handle new params (duration + question count) |

---

## Technical Details

### Helper Function for Duration Formatting
```tsx
const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};
```

### Fetching Best Score and Total Sessions
```tsx
const { data: stats } = useQuery({
  queryKey: ['speed-stats', student?.id],
  queryFn: async () => {
    const { data: completedSessions } = await supabase
      .from('student_activity_logs')
      .select('metadata')
      .eq('student_account_id', student.id)
      .eq('activity_type', 'speed_mode_complete');
    
    if (!completedSessions?.length) return { bestScore: null, totalSessions: 0 };
    
    const sessions = completedSessions.map(s => ({
      accuracy: s.metadata.total > 0 
        ? Math.round((s.metadata.correct / s.metadata.total) * 100) 
        : 0,
      avgTime: s.metadata.timer
    }));
    
    const best = sessions.reduce((prev, curr) => 
      curr.accuracy > prev.accuracy ? curr : prev
    , sessions[0]);
    
    return { bestScore: best, totalSessions: sessions.length };
  },
  enabled: !!student?.id
});
```

### UI Components Used (all from shadcn)
- `Card`, `CardHeader`, `CardTitle`, `CardContent` for containers
- `Slider` for time and question count selection
- `Select`, `SelectGroup`, `SelectLabel`, `SelectItem` for category dropdown
- `ChartContainer`, `ChartTooltip`, `ChartTooltipContent` for chart
- `Button` for start action
- `Label` for form labels

### Session Logic Update for StudentSpeedSession.tsx
The session page needs to be updated to:
1. Accept `duration` (total seconds for session) instead of `timer`
2. Accept `questions` (max questions to show) instead of unlimited
3. End session when either time runs out OR question limit is reached
