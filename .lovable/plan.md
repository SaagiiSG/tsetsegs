Four independent fixes/features. Each is scoped to keep blast radius small.

## Rendering safety guarantee (Point 3)

**The stored value format does not change.** Questions continue to be plain strings with `$...$` / `$$...$$` LaTeX delimiters exactly as they are today. `MathText` (delimiter-first per project memory) keeps rendering every existing question identically — no migration, no re-parse of the 2000+ question bank, no risk of visual regressions on old content.

The change is **input-only**: the admin textarea gains a slash-command popover that, on confirm, **splices `$<latex>$` into the string at the caret**. That is the exact same string an admin would produce today by clicking the math icon and pasting. The renderer never sees a new format.

Concretely, these guardrails are in the plan:
- No change to `MathText.tsx`, no change to how questions are read from DB, no change to `question_text` / `passage_text` / `multiple_choice_options` / `explanation` schema.
- No auto-wrapping of raw text (option B was rejected). Nothing gets rewritten unless the admin explicitly triggers `/math` or clicks the fx button.
- The existing `MathQuillEditor` block stays available behind a toggle for admins who prefer it.
- Verification step: before/after screenshots of 5 representative existing questions (plain, `$x^2$`, `$$\frac{a}{b}$$`, image + math, passage + math) confirming pixel-identical render.

## 1. Profile pop-up — tighter mobile layout

File: `src/components/student/leaderboard/FullProfileDialog.tsx` (+ small tweaks in child cards)

- Reduce mobile padding: `p-3` → `p-2.5`, section gap `space-y-4` → `space-y-3` on `<sm`.
- Sticky, blurred `DialogHeader` (`sticky top-0 bg-background/90 backdrop-blur`) so the student's name stays visible while scrolling.
- `ProfileHeader`: on mobile stack avatar + name on row 1, points chip on row 2 full-width; drop `text-xl` to `text-lg`; ensure `min-w-0 truncate` on username.
- `LevelProgressCard`: shrink ring from 112px → 88px on mobile via responsive size prop; label stack becomes `flex-col` under `sm`.
- `ActivityHeatmap`: wrap in `overflow-x-auto` with `-mx-2 px-2` so 7×N grid scrolls instead of squishing.
- `RankHistoryGraph` + `PerformanceStatsGrid`: force `grid-cols-2` on `<sm`, tabular-nums, truncate long labels.
- Close (X) button gets larger hit target (`h-10 w-10`) on mobile.

No data/logic changes.

## 2. HUD — visibility fix, keep localStorage

File: `src/components/student/challenges/ActiveChallengeHUD.tsx`

- Keep `localStorage` (matches rest of app). No storage-API change.
- Root cause of "I don't see it": a prior collapsed state was persisted from the previous change, and on some viewports the collapsed puck lands under the top nav or off-screen after anchor snapping. Fixes:
  - Bump `ANCHOR_KEY` / `COLLAPSED_KEY` to `-v2` so existing users get a fresh, visible default (top-center, expanded).
  - Clamp `anchorStyle()` so `top` anchor always adds `TOP_OFFSET`; raise HUD to `zIndex: 60` so it can't hide behind the header.
  - Minimum visible size for the collapsed puck (`min-w-[44px] min-h-[44px]`) with a subtle pulse ring so it's discoverable.
  - Double-tap the collapsed puck to fully expand + recenter.

## 3. Slash-command math inside the question textarea (input-only)

Goal: admin types normally; typing `/math` (or `$`) opens an inline MathQuill popover; on confirm, `$<latex>$` is inserted at the caret. Storage format unchanged → rendering unchanged.

New component: `src/components/admin/questions/MathAwareTextarea.tsx`
- Wraps shadcn `<Textarea>` with same props (`value`, `onChange`, `placeholder`, `rows`, `className`) — drop-in replacement.
- Watches keystrokes; when user types `/math` + space or `$` alone, records caret position and opens a Popover anchored near the caret (computed via a hidden mirror div).
- Popover embeds the existing `MathQuillEditor` (`minHeight="40px"`).
- Enter / "Insert" → splices `$<latex>$` into the value at the caret, replacing the trigger; Esc → cancels and restores the trigger text.
- Floating "fx" button (bottom-right of textarea) as discoverable fallback that opens the same popover — nothing regresses for admins who prefer clicking.
- Live preview strip (already present in QuestionForm) reused as-is.

Wire-up in `src/components/admin/questions/QuestionForm.tsx`:
- Replace `<Textarea>` with `<MathAwareTextarea>` for `question_text`, `passage_text`, each `multiple_choice_options[i]`, and `explanation`.
- Keep the existing top-right `MathQuillEditor` block behind a collapsible "Advanced math editor" toggle.

Safety (in addition to the guarantee at the top):
- Trigger detection uses a regex on the last few chars before the caret; ignores triggers **inside** an existing `$...$` span so old questions can't accidentally be re-triggered while editing.
- Debounced onChange to avoid re-render storms on long passages.
- No changes to non-question admin forms unless you ask.

## 4. Bluebook Explanation Videos tab (Google Drive folder)

Folder: `https://drive.google.com/drive/folders/1HvhNJkGiFbRJaq0ppW87fNi-oUb7rjKj`

### Backend
- Connect Google Drive via the Drive connector (developer-owned — shared course content, not per-student).
- New edge function `supabase/functions/list-bluebook-videos/index.ts`:
  - `GET https://connector-gateway.lovable.dev/google_drive/drive/v3/files?q='1HvhNJkGiFbRJaq0ppW87fNi-oUb7rjKj'+in+parents+and+mimeType+contains+'video'&fields=files(id,name,mimeType,thumbnailLink,modifiedTime)&pageSize=200`
  - Parses `name` for `Test\s*(\d+)` and optional `Module\s*(\d+)` / question hints to group by test.
  - Returns `[{ id, name, test, module?, thumbnailUrl, embedUrl: 'https://drive.google.com/file/d/{id}/preview' }]`.
  - CORS + validates caller session (student or staff). In-memory cache 5 min.

### Frontend
File: `src/pages/student/StudentBluebook.tsx`
- Add new tab "Explanation Videos" alongside existing tabs.
- New component `src/components/student/bluebook/BluebookVideosTab.tsx`:
  - `useQuery(['bluebook-videos'], fetchViaEdgeFn)`; render as accordion grouped by Test # (4–10), sorted ascending.
  - Each item: thumbnail (`?sz=w400`), title, "Watch" button opens a Dialog with a 16:9 `<iframe src={embedUrl} allowFullScreen />`.
  - Empty state + skeletons + error state.
- Mobile-first: single column, `aspect-video` iframe, sticky test-# section headers.

No writes to student data; purely read-only content surface.

## Verification

- Playwright at 390×844 for FullProfileDialog and BluebookVideosTab; screenshot both.
- Collapse/expand HUD across `/practice/home`, `/practice`, `/leaderboard` after clearing v1 keys — confirm v2 default shows top-center.
- **Rendering regression check**: open 5 existing questions before and after the QuestionForm change and diff screenshots — must be pixel-identical.
- Type `/math ` inside QuestionForm `question_text`; confirm popover, LaTeX insert, and that the resulting string is the same `$...$` an admin would produce today.

## Out of scope

- No changes to leaderboard scoring (Enkhjin / Zolzaya numbers unchanged).
- No schema changes.
- No changes to `MathText.tsx` or any renderer.
- No batch rewrite of existing question strings.
