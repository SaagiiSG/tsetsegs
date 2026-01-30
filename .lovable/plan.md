

# Group-Based Sprint Competition System

## Overview
Implement a group isolation system where students within each tier are divided into groups of maximum 40 students. Each group competes independently with their own P1 winner.

---

## Current State
- `student_sprint_rankings` table tracks: `sprint_id`, `student_account_id`, `current_tier`, `total_points`, `final_rank`, `is_top_1`
- All students of the same tier compete against each other (no group isolation)
- Single P1 winner per tier regardless of student count

## Proposed Changes

### 1. Database Schema Changes

**Add `group_number` column to `student_sprint_rankings`:**
```sql
ALTER TABLE student_sprint_rankings 
ADD COLUMN group_number INTEGER DEFAULT 1;

-- Add composite index for efficient group queries
CREATE INDEX idx_sprint_rankings_tier_group 
ON student_sprint_rankings(sprint_id, current_tier, group_number);
```

**Update unique constraint to allow same student only once per sprint:**
- Current: No explicit constraint beyond the existing unique per sprint
- Proposed: Keep as-is (one row per student per sprint, group is just metadata)

---

### 2. Enrollment Logic (Auto Group Assignment)

**File: `src/hooks/useLeaderboard.ts`**

When a student enrolls in a sprint:
1. Query existing students in that tier for this sprint
2. Count students per group number
3. Assign to the first group with less than 40 students
4. If all groups are full, create a new group (group_number + 1)

```text
Example: 120 unranked students
- First 40 students → Group 1
- Next 40 students → Group 2  
- Next 40 students → Group 3
- Student 121 would start Group 4
```

---

### 3. Leaderboard Display Changes

**File: `src/hooks/useLeaderboard.ts`**

Update leaderboard query to filter by group:
- Add `group_number` to the select
- When displaying leaderboard, filter by current user's group
- Students only see competitors in their group (max 40)

**File: `src/pages/student/StudentLeaderboard.tsx`**
- Display group indicator (e.g., "Group 2 of 3")
- Show only group members in the leaderboard

---

### 4. Sprint Finalization Changes

**File: `supabase/functions/finalize-sprint/index.ts`**

Update ranking calculation:
1. Group by tier AND group_number
2. Calculate ranks within each group independently
3. Each group gets its own P1 winner
4. Each P1 winner gets the promotion badge

```text
Example with 120 unranked:
- Group 1: P1 winner promotes to Bronze, gets badge
- Group 2: P1 winner promotes to Bronze, gets badge
- Group 3: P1 winner promotes to Bronze, gets badge
= 3 Bronze Novice badges awarded
```

---

### 5. Sprint Monitor Updates

**File: `src/pages/admin/SprintMonitor.tsx`**

Enhance the tier breakdown:
- Show actual groups with their students (not theoretical calculation)
- Display P1 winner per group
- Show group distribution

```text
┌─────────────────────────────────────────────────────────────┐
│ Tier Breakdown (Sprint 1)                                    │
├────────────┬──────────┬────────┬───────────────────────────┤
│ Tier       │ Students │ Groups │ P1 Winners                │
├────────────┼──────────┼────────┼───────────────────────────┤
│ Unranked   │ 120      │ 3      │ John D., Sarah M., Alex K│
│ Bronze     │ 80       │ 2      │ Mike P., Lisa T.          │
│ Gold       │ 40       │ 1      │ Emma W.                   │
└────────────┴──────────┴────────┴───────────────────────────┘
```

---

## Implementation Files

| File | Action | Purpose |
|------|--------|---------|
| Database Migration | Create | Add `group_number` column |
| `src/hooks/useLeaderboard.ts` | Modify | Add group assignment logic and filter queries by group |
| `src/pages/student/StudentLeaderboard.tsx` | Modify | Display group indicator |
| `supabase/functions/finalize-sprint/index.ts` | Modify | Rank within groups, multiple P1 winners |
| `src/pages/admin/SprintMonitor.tsx` | Modify | Show real group data |

---

## Group Assignment Algorithm

```text
function assignGroup(sprintId, tier):
  # Get current group counts for this tier
  groups = query "SELECT group_number, COUNT(*) 
                  FROM student_sprint_rankings 
                  WHERE sprint_id = ? AND current_tier = ?
                  GROUP BY group_number 
                  ORDER BY group_number"
  
  # Find first group with space
  for each group in groups:
    if group.count < 40:
      return group.group_number
  
  # All groups full, create new one
  return (max group_number) + 1
```

---

## Edge Cases

1. **Mid-sprint tier changes**: Students keep their group even if they would theoretically change tiers (tier is locked at enrollment)

2. **Group balancing**: New students fill existing groups before creating new ones (no active rebalancing)

3. **Very few students**: If only 10 students in a tier, they form 1 group with 10 members

4. **Exactly 40 students**: Perfect single group, student 41 starts Group 2

---

## Summary

This change ensures fair competition by limiting each group to 40 students max. Multiple P1 winners per tier means more badges are awarded and more students get promoted, maintaining engagement as the platform scales.

