

## Add Math/English Subject Toggle to Student Stats Page

### What changes
The Stats page currently shows combined analytics for all subjects. We'll add a subject toggle (Math / English) so students can view analytics filtered by subject.

### Plan

**1. Update `useStudentAnalytics` hook** (`src/hooks/useStudentAnalytics.ts`)
- Add a `subject` parameter (`'math' | 'english' | 'all'`) to the hook
- Filter the Supabase query on `questions.subject` when a subject is selected
- Filter the total questions count query similarly
- Include `subject` in the `queryKey` so data refetches on toggle

**2. Update `StudentStats` page** (`src/pages/student/StudentStats.tsx`)
- Add `subject` state defaulting to `'math'`
- Add a `Tabs` component (Math / English) in the header area, below the title
- Pass the selected subject into `useStudentAnalytics(subject)`
- The rest of the page stays the same — all child components already accept generic data props

### Technical notes
- The hook already maps topics to subjects via `TOPIC_SUBJECTS` — we'll filter attempts and questions by `question.subject` field from the database rather than the local mapping
- Score target logic may differ per subject but we'll keep it simple initially (same target)
- No database changes needed

