

# Admin Dashboard Fixes + Sprint & Season Monitor

## Overview
This plan addresses three items:
1. **Fix missing Question Bank & Bluebook buttons** in the admin sidebar (currently hidden in production)
2. **Create Sprint & Season Monitoring page** for admins to view competition data
3. **Future consideration**: Add group number tracking for tier-based grouping (max 40 per group)

---

## Part 1: Fix Question Bank & Bluebook Visibility

### Problem
The "Question Bank" and "Bluebook" navigation items are only shown in development mode because:
- `AdminSidebar.tsx` (lines 75-78): These items are in `devItems` array
- `AdminSidebar.tsx` (lines 92-97): `devItems` only get added when `import.meta.env.DEV` is true
- `Admin.tsx` (lines 75-76): Routes are wrapped with `import.meta.env.DEV` condition

### Solution
Move these items to always be visible, since this is used by internally trusted team members.

### Changes

**File: `src/components/admin/AdminSidebar.tsx`**
- Move "Question Bank" and "Bluebook" from `devItems` to the main `items` array in the Tools section
- Remove the `devItems` property from Tools section

**File: `src/pages/Admin.tsx`**
- Remove the `import.meta.env.DEV` condition wrapper around the Question Bank and Bluebook routes

---

## Part 2: Sprint & Season Monitoring Page

### Features

**Active Sprint Overview**
- Current sprint status card with live countdown timer
- Season and sprint number display (e.g., "Season 3, Sprint 1")
- Total participants count

**Season Navigator**
- Dropdown to select different seasons
- Display all 3 sprints within the selected season as cards:
  - Status badge (Active / Completed / Upcoming)
  - Date range
  - Participant count per tier

**Tier Breakdown View**
- Expandable sections showing participants per tier
- For each tier, show:
  - Number of students in that tier
  - Number of groups (students ÷ 40, rounded up)
  - P1 winner(s) if sprint is completed

**Rankings Table**
- Click on a sprint to see detailed rankings
- Columns: Rank, Student Name, Tier, Points, P1 Status, Advancement Status
- Filter by tier

**Admin Quick Actions**
- Button to manually trigger sprint finalization (for testing)
- View sprint history

### UI Layout

```text
┌─────────────────────────────────────────────────────────────────┐
│  Sprint Monitor                                                  │
│  ────────────────────────────────────────────────────────────── │
│                                                                  │
│  ┌──────────────────────────┐  ┌────────────────────────────┐   │
│  │ Active Sprint            │  │ Season Progress            │   │
│  │ Season 3, Sprint 1       │  │ [====------] 1 of 3        │   │
│  │ Ends in: 5d 14h 23m      │  │ Started: Jan 15, 2026      │   │
│  │ 120 participants         │  └────────────────────────────┘   │
│  └──────────────────────────┘                                    │
│                                                                  │
│  Season: [Season 3 ▼]                                            │
│                                                                  │
│  ┌────────────────┬────────────────┬────────────────┐           │
│  │ Sprint 1       │ Sprint 2       │ Sprint 3       │           │
│  │ Active         │ Upcoming       │ Upcoming       │           │
│  │ Jan 15-29      │ Jan 30-Feb 12  │ Feb 13-27      │           │
│  │ 120 students   │ -              │ -              │           │
│  └────────────────┴────────────────┴────────────────┘           │
│                                                                  │
│  Tier Breakdown (Sprint 1)                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Tier       │ Students │ Groups │ P1 Winner              │   │
│  ├──────────────────────────────────────────────────────────┤   │
│  │ Unranked   │ 120      │ 3      │ -                       │   │
│  │ Bronze     │ 80       │ 2      │ -                       │   │
│  │ Silver     │ 40       │ 1      │ -                       │   │
│  │ Gold       │ 40       │ 1      │ -                       │   │
│  │ Platinum   │ 50       │ 2      │ -                       │   │
│  │ Diamond    │ 20       │ 1      │ -                       │   │
│  │ Ruby       │ 10       │ 1      │ -                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [ View Full Rankings ] [ Finalize Sprint (Test) ]               │
└─────────────────────────────────────────────────────────────────┘
```

### Files to Create

**`src/pages/admin/SprintMonitor.tsx`**
- Main monitoring page with all the features above
- Uses React Query to fetch sprint and ranking data
- Includes countdown timer component

### Files to Modify

**`src/components/admin/AdminSidebar.tsx`**
- Add "Sprint Monitor" nav item to Tools section with Trophy icon

**`src/pages/Admin.tsx`**
- Add route for `/admin/sprint-monitor`
- Import SprintMonitor component

---

## Part 3: Group Number System (Future Consideration)

Currently, the system doesn't track which sub-group a student belongs to within their tier. With your example:
- 120 unranked students → 3 groups (40 each)
- 80 bronze students → 2 groups (40 each)
- etc.

### Current Behavior
- All students of the same tier compete against each other
- Rankings are calculated across the entire tier

### To Implement Group Isolation
This would require:
1. Adding a `group_number` column to `student_sprint_rankings` table
2. Modifying the auto-enrollment logic to assign group numbers (round-robin or random)
3. Updating the leaderboard queries to filter by group_number
4. Updating finalize-sprint to rank within groups, not across the whole tier

**Note**: This is a significant change that affects the competition dynamics. The Sprint Monitor page will be built to show the current structure (tier-level competition) but can be extended later if group isolation is implemented.

---

## Implementation Order

1. Update `AdminSidebar.tsx` - move devItems to main items
2. Update `Admin.tsx` - remove DEV conditions, add sprint-monitor route
3. Create `SprintMonitor.tsx` - new monitoring page

---

## Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/components/admin/AdminSidebar.tsx` | Modify | Show Question Bank, Bluebook, add Sprint Monitor |
| `src/pages/Admin.tsx` | Modify | Remove DEV conditions, add route |
| `src/pages/admin/SprintMonitor.tsx` | Create | New monitoring page |

This will give you full visibility into all sprints, seasons, and tier breakdowns with group calculations based on the 40-student-per-group rule.

