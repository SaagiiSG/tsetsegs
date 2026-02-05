
# Plan: Fix Ruby Tier Sprint Placement & Mobile Keyboard DevTools False Positive

## Problem Analysis

### Issue 1: Ruby Ranked Student in Unranked Sprint

**Root Cause Identified:**
- Student `Bayrkhuu` (ID: `8e3329df-23ff-48a0-825c-7c729934e115`) has a history showing:
  - Season 4, Sprint 1: Diamond tier → P1 → `reserved_next_tier: ruby`
  - Season 5, Sprint 1: Placed in `unranked` group with 0 points

- The auto-enrollment logic in `SprintMonitor.tsx` (lines 183-191) assigns ALL students to `unranked` tier:
  ```typescript
  const rankings = activeStudents.map((student, index) => ({
    ...
    current_tier: 'unranked', // ❌ Ignores previous tier/reserved tier
    ...
  }));
  ```

- The `useLeaderboard.ts` auto-enrollment (lines 252-262) DOES respect previous tier:
  ```typescript
  const startingTier = previousRanking?.reserved_next_tier || previousRanking?.current_tier || 'unranked';
  ```

- **The admin bulk-seeding overrides the correct tier logic.**

**Additional Issue for Ruby Tier:**
- Ruby tier will typically have only 1-2 students (since only P1 from Diamond advances)
- Students in a tier with no group mates have no leaderboard to display
- Need to show a graceful message: "No active sprint for your tier - you're in an exclusive group!"

---

### Issue 2: Mobile Keyboard Triggers DevTools Warning

**Root Cause Identified:**
- The `SecurityWrapper.tsx` handles window blur events (lines 77-87):
  ```typescript
  const handleWindowBlur = () => {
    setTimeout(() => {
      if (isAllowedFocusTarget()) return;
      setIsBlurred(true);
      setBlurReason('Window not in focus');
    }, 100);
  };
  ```

- The `isAllowedFocusTarget()` function (lines 42-57) only allows Desmos calculator iframes
- When students tap on an `<Input>` field on mobile, the keyboard appears and can trigger:
  1. Window blur events (focus shifts to keyboard area)
  2. Viewport resize (which `useDevToolsDetection` monitors)

- `useDevToolsDetection.ts` uses window size thresholds (line 40-42):
  ```typescript
  const widthThreshold = window.outerWidth - window.innerWidth > 200;
  const heightThreshold = window.outerHeight - window.innerHeight > 200;
  ```

- On mobile, keyboard appearance causes significant viewport height changes that can exceed 200px

---

## Technical Solution

### Fix 1: Respect Previous Tier in Admin Bulk Enrollment

**File:** `src/pages/admin/SprintMonitor.tsx`

**Changes:**
1. Fetch each student's latest tier from `student_sprint_rankings` before inserting
2. Use `reserved_next_tier` (if exists) or `current_tier` as starting tier for the new sprint
3. Group students by their actual tier, not just as "unranked"

```typescript
// Instead of flat assignment to 'unranked':
// 1. Fetch previous rankings for all students
// 2. Map each student to their proper starting tier
// 3. Group by tier, then by group_number within each tier
```

### Fix 2: Handle Ruby Tier with No Sprint Group

**File:** `src/components/student/leaderboard/CurrentSprintTab.tsx` (or wherever leaderboard renders)

**Changes:**
1. Check if leaderboard is empty for current tier
2. Display special message for solo/empty tier groups:
   - "You're in the {Tier Name} tier - a very exclusive rank!"
   - "There's no competition in your tier group this sprint. Keep earning points to maintain your status!"

### Fix 3: Prevent Mobile Keyboard from Triggering Security Alerts

**File:** `src/components/security/useDevToolsDetection.ts`

**Changes:**
1. Detect mobile devices and disable height-based DevTools detection on mobile
2. Mobile keyboards naturally change viewport height significantly
3. Keep width-based detection as fallback (DevTools on mobile is extremely rare)

```typescript
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

// On mobile, only use width threshold (keyboard affects height, not width)
const widthThreshold = window.outerWidth - window.innerWidth > 200;
const heightThreshold = !isMobile && (window.outerHeight - window.innerHeight > 200);
```

**File:** `src/components/security/SecurityWrapper.tsx`

**Changes:**
1. Extend `isAllowedFocusTarget()` to include input/textarea elements
2. When focus is on a form field, don't trigger blur security

```typescript
const isAllowedFocusTarget = useCallback(() => {
  const activeElement = document.activeElement;
  const tagName = activeElement?.tagName?.toLowerCase();
  
  // Allow focus on input fields (for mobile keyboard)
  if (tagName === 'input' || tagName === 'textarea') {
    return true;
  }
  
  // Existing Desmos checks...
}, []);
```

### Fix 4: Add Mobile-Friendly Numpad (Optional Enhancement)

**New Component:** `src/components/student/MobileNumpad.tsx`

If desired, create a custom on-screen numpad that students can use for fill-in-the-blank answers:
- Appears when tapping the input field on mobile
- Numbers 0-9, decimal point, negative sign, backspace
- Avoids native keyboard entirely

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/admin/SprintMonitor.tsx` | Fetch and use previous tier when bulk-enrolling students |
| `src/components/security/useDevToolsDetection.ts` | Disable height threshold on mobile devices |
| `src/components/security/SecurityWrapper.tsx` | Allow input/textarea focus without triggering blur |
| `src/components/student/leaderboard/CurrentSprintTab.tsx` | Add empty tier/group message for Ruby or solo players |

---

## Database Considerations

For the Ruby student who was incorrectly assigned:
- Need to UPDATE their current record in `student_sprint_rankings`:
  ```sql
  UPDATE student_sprint_rankings
  SET current_tier = 'ruby', group_number = 1
  WHERE student_account_id = '8e3329df-23ff-48a0-825c-7c729934e115'
  AND sprint_id = 'ea788cb6-c684-47a8-8547-f50fcacfd0d9';
  ```

---

## Summary

1. **Ruby tier fix**: Update enrollment logic to respect previous/reserved tiers + fix the specific student's record
2. **Empty tier UX**: Add graceful messaging when a student's tier has no other competitors  
3. **Mobile keyboard fix**: Exempt input fields from blur detection + disable height-based DevTools check on mobile
4. **Optional numpad**: Build a custom numpad to completely avoid native keyboard issues
