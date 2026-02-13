
# Tier Breakdown Redesign: Horizontal Carousel with Tabbed Groups

## Overview
Replace the current vertical stacked tier list with a horizontal carousel of large tier cards. Each card shows one tier's details with tabbed group switching inside.

## Layout

```text
  Tier Breakdown
  Student distribution across tiers (40+-15 per group)

  [<]  [ ===== SILVER CARD ===== ]  [>]
       Top-left: 🥈 Silver | 60 students
       Top-right: 2 groups
       ─────────────────────────────
       [Group 1] [Group 2]   <-- tabs
       ─────────────────────────────
       Collapsible student list:
         #1  Student Name   1,200 pts  👑
         #2  Student Name     980 pts
         ...
```

## Changes (single file: `src/pages/admin/SprintMonitor.tsx`)

### 1. Add state for active tier index
- Replace `expandedTier` state with `activeTierIndex` (number) to track which tier card is visible.
- Add `activeGroupTab` state (Record or simple number) to track which group tab is selected within the current card.

### 2. Navigation controls
- Left/right arrow buttons flanking the card.
- Disable left on first tier, disable right on last tier.
- Optional: dot indicators below showing which tier is active.

### 3. Tier card design
- Significantly taller card (min-height ~400px).
- Header section:
  - Top-left: Tier icon + tier name (capitalized) + "X students" badge.
  - Top-right: "X groups" badge.
- Body section:
  - Tabs component (one tab per group: "Group 1", "Group 2", etc.).
  - Active tab shows the student rankings table for that group.
  - Each group's student list is inside a Collapsible so it can be expanded/collapsed.
  - P1 winner highlighted at top of each group with crown icon.

### 4. Imports
- Add `Tabs, TabsList, TabsTrigger, TabsContent` from UI components.
- Add `ChevronLeft, ChevronRight` from lucide-react (replace or add to existing chevrons).

### Technical Details
- No new files needed -- all changes within `SprintMonitor.tsx`.
- Reuse existing `tierBreakdown` data and `TIER_STYLES` config.
- The student table inside each group tab remains the same structure (rank, name, points, P1 crown).
- Show all students per group (remove the "show top 10 + X more" truncation) since each group maxes at 55.
