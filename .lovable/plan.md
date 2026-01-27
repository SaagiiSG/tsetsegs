
# Merged Practice Page Plan

## Overview
This plan merges the Math and English practice pages into a single unified page with an island-style selector at the top and a two-column layout below for category/subtopic selection and question display.

---

## New Layout Design

```text
+------------------------------------------------------------+
|  ISLAND (rounded, elevated container)                       |
|  +--------------------------------------------------------+ |
|  | [Math] [English]     [68] [CB] (when math selected)    | |
|  | ====================================================== | |
|  | Overall Progress: ████████████░░░░░░░░░  45%           | |
|  +--------------------------------------------------------+ |
+------------------------------------------------------------+
|                                                              |
|  LEFT HALF (50%)              |  RIGHT HALF (50%)            |
|  +------------------------+   |  +------------------------+  |
|  | Categories & Subtopics |   |  | Selected Area Progress |  |
|  |                        |   |  | + Question Grid        |  |
|  | ▼ Advanced Math        |   |  |                        |  |
|  |   • Equivalent expr    |   |  | [Q1] [Q2] [Q3] [Q4]    |  |
|  |   • Quadratics         |   |  | [Q5] [Q6] [Q7] [Q8]    |  |
|  | ▼ Algebra              |   |  |                        |  |
|  |   • Linear equations   |   |  |                        |  |
|  |   • Systems            |   |  |                        |  |
|  | ▼ Geometry & Trig      |   |  |                        |  |
|  | ▼ Problem Solving      |   |  |                        |  |
|  +------------------------+   |  +------------------------+  |
+------------------------------------------------------------+
```

---

## Implementation Steps

### Step 1: Refactor StudentPractice.tsx

Replace the current layout with the new unified structure:

**State Management:**
- `subject`: 'math' | 'english'
- `questionSet`: '68' | 'CB' (only applies when math is selected)
- `selectedCategory`: string | null (category ID or 'all')
- `selectedSubtopic`: string | null (subtopic name or null for all in category)

**Island Component:**
- Container with rounded corners, elevated shadow, gradient background
- Row 1: Button group for Math/English toggle
- Row 1 (continued): When Math selected, show 68/CB toggle buttons in same row
- Row 2: Overall progress bar spanning full width

**Left Panel (Category Sidebar):**
- Scrollable list of 4 categories based on subject selection
- Each category is a collapsible section (using Collapsible from shadcn)
- Category header is clickable (selects entire category)
- Subtopics listed under each category, each clickable
- Visual indicator for selected category/subtopic

**Right Panel (Questions Display):**
- Progress bar for selected area (category or subtopic)
- Question grid matching current practice page style
- Filtered based on left panel selection

### Step 2: Data Queries

**Fetch Questions:**
```tsx
const { data: questions } = useQuery({
  queryKey: ['practice-questions', subject, questionSet],
  queryFn: async () => {
    let query = supabase
      .from('questions')
      .select('id, question_id, category_id, subtopic, category:question_categories(id, name)')
      .eq('is_original', true)
      .eq('is_active', true)
      .eq('subject', subject);
    
    if (subject === 'math') {
      query = query.eq('question_set', questionSet === '68' ? '68' : 'CollegeBoard');
    }
    return query.order('question_id');
  }
});
```

**Build Category + Subtopic Tree:**
```tsx
const categoryTree = useMemo(() => {
  const tree = categories?.map(cat => ({
    ...cat,
    subtopics: [...new Set(
      questions?.filter(q => q.category_id === cat.id)
        .map(q => q.subtopic)
        .filter(Boolean)
    )]
  }));
  return tree;
}, [categories, questions]);
```

### Step 3: Left Panel Component

**Structure:**
```tsx
<div className="w-1/2 pr-4 border-r">
  <ScrollArea className="h-[calc(100vh-300px)]">
    {categoryTree?.map(cat => (
      <Collapsible key={cat.id} defaultOpen>
        <CollapsibleTrigger 
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted",
            selectedCategory === cat.id && !selectedSubtopic && "bg-primary/10"
          )}
          onClick={() => {
            setSelectedCategory(cat.id);
            setSelectedSubtopic(null);
          }}
        >
          <span className="font-medium">{cat.name}</span>
          <ChevronDown className="h-4 w-4" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 space-y-1">
          {cat.subtopics.map(subtopic => (
            <Button
              key={subtopic}
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-sm",
                selectedSubtopic === subtopic && "bg-primary/10"
              )}
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedSubtopic(subtopic);
              }}
            >
              {subtopic}
            </Button>
          ))}
        </CollapsibleContent>
      </Collapsible>
    ))}
  </ScrollArea>
</div>
```

### Step 4: Right Panel Component

**Structure:**
```tsx
<div className="w-1/2 pl-4">
  {/* Selected Area Header & Progress */}
  <Card className="mb-4">
    <CardHeader className="pb-2">
      <CardTitle className="text-base">
        {selectedSubtopic || selectedCategoryName || 'All Questions'}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Progress value={areaProgressPercent} className="h-2" />
      <p className="text-sm text-muted-foreground mt-1">
        {areaCompleted}/{areaTotal} mastered
      </p>
    </CardContent>
  </Card>

  {/* Question Grid */}
  <ScrollArea className="h-[calc(100vh-400px)]">
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {filteredQuestions.map(question => (
        <QuestionCard key={question.id} question={question} />
      ))}
    </div>
  </ScrollArea>
</div>
```

### Step 5: Filtering Logic

```tsx
const filteredQuestions = useMemo(() => {
  if (!questions) return [];
  
  return questions.filter(q => {
    // Filter by category if selected
    if (selectedCategory && selectedCategory !== 'all') {
      if (q.category_id !== selectedCategory) return false;
    }
    
    // Filter by subtopic if selected
    if (selectedSubtopic) {
      if (q.subtopic !== selectedSubtopic) return false;
    }
    
    return true;
  });
}, [questions, selectedCategory, selectedSubtopic]);
```

### Step 6: Update Routes

**Changes to App.tsx:**
- Keep `/practice/dashboard` pointing to the merged StudentPractice
- Remove or redirect `/practice/english` to `/practice/dashboard`

---

## Files to Modify

| File | Action |
|------|--------|
| `src/pages/student/StudentPractice.tsx` | Major refactor - new layout |
| `src/App.tsx` | Update routes (remove/redirect English practice) |

---

## Technical Notes

### Responsive Design
- On mobile (< lg breakpoint), stack left/right panels vertically
- Island remains horizontal with wrapping buttons
- Use `grid-cols-1 lg:grid-cols-2` for the split layout

### Subtopic Availability
- Currently only CollegeBoard questions have subtopics populated
- 68 question set may not have subtopics - show "No subtopics" message
- English questions should have subtopics from the import system

### UI Components Used (all from shadcn)
- `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent` for category sections
- `ScrollArea` for scrollable panels
- `Progress` for progress bars
- `Button` for toggles and selections
- `Card` for containers

### Performance
- Memoize categoryTree and filteredQuestions
- React Query caching for data fetching
- Only render visible questions in ScrollArea
