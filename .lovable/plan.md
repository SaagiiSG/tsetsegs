

## Plan: Add English Tab to Admin Question Bank

The question bank already has math tabs (68, CB, 150) and import tabs. Since there's already an "Import Eng" tab for importing English questions, we just need a viewing tab and stat card for them.

### Changes

**1. `src/components/admin/questions/QuestionList.tsx`**
- Expand `questionSet` type: `'68' | 'CB' | '150' | 'english'`
- Add filter branch: when `questionSet === 'english'`, query `.eq('subject', 'english')` instead of filtering by `question_set`
- Show passage indicator for English questions that have `passage_text`

**2. `src/pages/admin/QuestionBank.tsx`**
- Add `questionsEnglishCount` query counting questions where `subject = 'english'`
- Add an "English" stat card to the top row (update grid to `md:grid-cols-6`)
- Add `TabsTrigger` for `"questions-english"` labeled "English" between "CB" and "Import Math"
- Add `TabsContent` rendering `<QuestionList onEdit={handleEdit} questionSet="english" />`
- Update `getAddButtonText` to return null for the English tab (import-only)

### Technical notes
- English questions use `subject = 'english'` and IDs prefixed with `ENG`
- No structural changes needed on student-facing pages — English practice already has dedicated separate pages (`StudentEnglishPractice`, `StudentEnglishQuestion`)

