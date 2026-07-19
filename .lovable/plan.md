## 1. Teaching SOP Checklist

**Seed content.** Import the 26 topics from your Google Doc into a static file `src/data/teachingChecklist.ts` — each topic has an id, title, time estimate, and array of sub-items. I'll also define a fixed session→topics map placeholder (you'll fill the exact grouping in that file after we scaffold it).

**Data model (per-batch progress + global template).**
New table `teaching_checklist_progress`:
- `teacher_id` (auth.uid), `batch_id` (nullable — null = teacher's global checklist), `item_key` (e.g. `"3.desmos-shavriin"`), `checked_at`, `note` (optional).
- Unique on (teacher_id, batch_id, item_key).
- RLS: teachers see/write only their own rows; admins full access.
- Realtime enabled so desktop ↔ phone stay in sync live.

**Desktop entry point.** On each big class card add a "Teaching SOP" button. On the dashboard header add a "My checklist" button (global mode).

**Popup (`ChecklistLauncherDialog`).**
- Header: batch name (or "Global") + toggle **By Topic / By Session**.
- Right pane: QR code + short URL to the mobile route (existing teacher session carries via cookie, so scanning on their logged-in phone lands straight in).
- Left pane: live-preview of the checklist with % complete, so you can watch check-offs come in from the phone.

**Mobile route `/teacher/checklist/:batchId?` (also `/teacher/checklist` for global).**
- Full-screen, one-hand friendly: sticky tab (Topics | Sessions), collapsible topic cards, big tap targets, haptics on check, autosave.
- "By Session" view groups topics per the fixed map; a session shows aggregate progress and expands to its topics.
- Optional per-item note field (small pencil) for teachers to jot what worked.
- Works on desktop too (same component, responsive) so the popup can be used standalone if no phone available.

**Realtime.** Both desktop popup and phone subscribe to `teaching_checklist_progress` filtered by (teacher_id, batch_id) so a check on phone flips the box on desktop instantly.

## 2. Class Carousel — bigger + smooth iOS feel

`ClassCardBig.tsx`
- Height: `h-[85vh]` (near full screen, dock + top bar remain visible), width stays 75vw.
- Internal layout re-flowed into 3 vertical sections (header/stats/needs-attention) with more breathing room now that height is larger.
- Inactive cards scale to `0.9` + `opacity 0.6` + slight `blur-[1px]`; active card `scale 1`. Framer Motion spring `{ stiffness: 220, damping: 28 }` for natural iOS spring.

`ClassCarousel.tsx`
- Wrap track in a container with left/right **fade masks** (`mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent)`) so cards dissolve into the edge instead of hard-cutting.
- Track uses `scroll-snap-type: x mandatory` with `snap-align: center`; each item has `scroll-snap-stop: always`.
- Track wrapped in Framer Motion `LayoutGroup`; on snap change we run `animate()` on scale/opacity of neighbors → the size change feels continuous, not stepped.
- Arrow buttons: moved outside `overflow-hidden` region (fix current clipping), sit on top of the fade with a subtle blurred pill background.
- Momentum: enable trackpad/touch inertial scroll; add keyboard ←/→ + swipe threshold for mouse drag.

## Files touched

New:
- `src/data/teachingChecklist.ts` (seeded from your doc)
- `src/components/teacher/checklist/ChecklistLauncherDialog.tsx`
- `src/components/teacher/checklist/ChecklistView.tsx` (shared desktop+mobile)
- `src/components/teacher/checklist/SessionGroup.tsx`, `TopicRow.tsx`
- `src/pages/TeacherChecklistMobile.tsx` + route in `App.tsx`
- `src/hooks/useTeachingChecklist.ts` (fetch + realtime + toggle)
- Migration: `teaching_checklist_progress` table, RLS, grants, realtime publication

Edited:
- `src/components/teacher/dashboard/ClassCardBig.tsx` — height, layout, SOP button
- `src/components/teacher/dashboard/ClassCarousel.tsx` — mask edges, spring scale, arrow positioning
- `src/pages/TeacherDashboard.tsx` — global "My checklist" button in header

## Open item to confirm during build

The exact **session → topic-numbers map** (e.g. Session 1 = topics 1-2). I'll leave a clearly-marked `SESSION_MAP` constant in `teachingChecklist.ts` with a reasonable first pass based on the time estimates; you tweak the array once and both views update.
