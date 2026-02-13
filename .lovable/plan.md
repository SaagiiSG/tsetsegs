

## Batches UI Redo

### Current State
The "All Batches" section uses a grid of cards (`BatchGridCard`). Clicking a card opens `BatchDetailsDialog` (split-pane: left = batch info/SMS template, right = student list). Editing requires clicking "Edit Batch" button inside that dialog, which opens a separate `EditBatchDialog` with tabs (Details / Students).

### New Design

**1. List View Grouped by Month**

Replace the grid with a flat list, grouped under month headers (e.g., "Feb 2026", "Jan 2026"). Each row is a single horizontal line:

```text
--- Feb 2026 ---
SAT  |  Saran-Ochir  |  16:40 MWF+Sat  |  Feb 3  |  12 students  |  ...
SAT  |  Manlai       |  18:40 MWF+Sat  |  Feb 3  |  8 students   |  ...

--- Jan 2026 ---
IELTS |  Dulguun, Udval  |  16:30 TT+Sat  |  Jan 6  |  15 students  |  ...
```

- Course type badge (color-coded SAT blue / IELTS purple)
- Teacher name
- Compact schedule (reuse existing `formatShortSchedule` logic from `BatchGridCard`)
- Start date (short: "Feb 3")
- Student count
- 3-dot menu (MoreHorizontal icon) with context menu actions: Edit, Copy Link, Open Link, Regenerate Link, SMS Template, Delete

**2. Context Menu on 3-Dots**

Using `DropdownMenu` from shadcn. Menu items:
- Edit Batch -- opens the new edit dialog
- Copy Link
- Open Link
- Regenerate Link
- Copy SMS Template
- Delete Batch (destructive, with confirmation)

**3. Redesigned Edit Dialog (Split Pane)**

When "Edit" is clicked, open a dialog similar to current `BatchDetailsDialog` layout (full-width split pane):
- **Left side**: Batch editor form directly (teacher, schedule, room, start date, FB group link, save button) -- no tabs, straight-up editing
- **Right side**: Students list with add/bulk import/edit/remove (same as current `EditBatchDialog` students tab)

This merges `BatchDetailsDialog` and `EditBatchDialog` into one unified component.

### Technical Changes

| File | Action |
|------|--------|
| `src/components/admin/BatchesView.tsx` | Rewrite "All Batches" section: replace grid with month-grouped list rows |
| `src/components/admin/BatchListRow.tsx` | **New** -- single batch row component with 3-dot dropdown menu |
| `src/components/admin/BatchDetailsDialog.tsx` | Refactor: left side becomes the batch editor form, right side stays as students list. Merge edit functionality from `EditBatchDialog` directly into this dialog |
| `src/components/admin/BatchGridCard.tsx` | No longer used by BatchesView (keep for BatchOverview if still used there) |

### Key Details

- Month grouping: derive from `start_date`, format as "MMM YYYY", sort descending (newest first)
- Filters (course, intake, teacher) remain at the top unchanged
- The edit dialog opens directly from the 3-dot menu -- no intermediate "details" view
- All existing functionality (copy link, regenerate, delete, SMS template, student management) is preserved, just reorganized

