# Intense Prep roster: attendance, manual progress, 5 note boxes

Three new inputs on the prep class roster table (`/teacher/intense-prep` → open a class), all inline-editable and saved instantly like the existing Bluebook score inputs.

## 1. Attendance for each prep day

- The day columns are derived from the class's start and end date. Aug 17 → Aug 21 gives 5 columns: `17`, `18`, `19`, `20`, `21` with the weekday letter above (M T W T F).
- Each cell is a tap-to-cycle chip, matching the mobile attendance pattern already used in class attendance: blank → Present (green) → Late (amber) → Absent (red) → Excused (grey) → blank.
- Header shows a per-day present count (e.g. `12/18`), and each student row shows their own attended count next to their name.
- If a class has no start/end date yet, the attendance block shows a short "Set prep dates" prompt with a button that opens the class edit dialog instead of empty columns. Dates can be edited later; changing them re-derives columns and keeps any attendance already recorded for dates still in range.
- Range is capped at 14 days so a mistyped date can't explode the table.

## 2. Manual input next to the 68 / 150 / CB rings

- Each of the three set columns gets a small numeric input directly beside its ring.
- It is a separate, hand-entered notebook count — it does not change the ring, which keeps showing platform-solved progress only. The manual number renders in a distinct style (mono, amber) so it's obvious it was typed by a teacher, not tracked by the platform.
- Empty = nothing entered (shows `—`), not zero. Values clamp to the set's total question count, and clear on blur if the input isn't a number.
- Saves on blur, same as the Bluebook score cells.

## 3. Five note checkboxes

- The single "Noted" checkbox becomes five independent boxes labelled `1`–`5`, unrelated to dates.
- A student who already had the old single checkbox ticked comes across as box 1 ticked, so nothing already recorded is lost.
- Header tooltip explains they are five review/note tasks; a small `n/5` counter sits under each row's boxes.

## Layout notes

- The table already scrolls horizontally. Student name stays pinned as the first column so it's readable while scrolling into the attendance and note columns.
- Column groups get subtle vertical separators (Progress | Attendance | Bluebook | Notes) so the wider table stays scannable.
- Everything stays optimistic-then-save with a toast on failure, so a slow connection never loses a tap.

## Technical

Migration on `public.intense_prep_tracking` (grants and RLS already exist on the table, unchanged):

- `prep_attendance jsonb not null default '{}'` — keyed by ISO date, value one of `present | late | absent | excused`.
- `manual_solved jsonb not null default '{}'` — keys `68`, `150`, `cb`, integer values.
- `note_checks boolean[] not null default array[false,false,false,false,false]` — backfilled so rows with `prep_session_notes = 1` get `{true,false,false,false,false}`. `prep_session_notes` stays in place, untouched, to avoid breaking anything else reading it.

Frontend changes are confined to `src/components/teacher/intense-prep/PrepClassRoster.tsx` (new derived day list, three new cell components, extended `saveTracking` patch shape) plus the class create/edit dialog in `IntensePrepGroupList.tsx` if start/end dates aren't already editable there.
