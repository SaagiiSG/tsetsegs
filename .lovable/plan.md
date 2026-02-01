

## Plan: Modernize Attendance Slider with Speed Session Style + Fix Lag

### Overview
Transform the attendance slider from a vertical drum picker to a modern iOS-style select picker matching the speed session design, while also fixing the lag caused by unnecessary data re-fetching.

---

### Part 1: Redesign the Attendance Slider

**Current State:** Vertical drum picker with scroll-based selection
**Target State:** iOS-style scroll picker matching the `ScrollPicker` from speed session mode

**Design Changes:**
- Increase item height from 28px to 44px for better touch targets
- Add refined selection indicator with rounded corners
- Improve gradient overlays for polished fading effect
- Add scaling animation for selected item (scale-105)
- Better typography with bold primary color for selected state
- Smoother transitions and snap behavior

**File to Modify:** `src/components/teacher/AttendanceSlider.tsx`

**Key Visual Elements:**
- Selection indicator: `bg-primary/10 border-y border-primary/20 rounded-lg`
- Gradient overlays: Smooth fade from card background
- Selected state: `text-primary font-bold text-base scale-105`
- Unselected state: `text-muted-foreground/70 text-sm`

---

### Part 2: Fix Performance Lag

**Root Cause:** The `TeacherClassAttendance.tsx` page calls `fetchData()` after every attendance update, which:
1. Re-fetches the batch info
2. Re-fetches all students
3. Re-fetches all attendance records
4. Checks for duplicate students (another query)

**Solution:** Apply optimistic UI updates (update local state immediately) and remove the `fetchData()` call, matching the pattern used in `TeacherStudentCards.tsx`.

**File to Modify:** `src/pages/TeacherClassAttendance.tsx`

**Changes:**
- Update local `attendance` state immediately after successful database update
- Remove the `fetchData()` call from `updateAttendance` function
- Keep database update async without blocking UI

---

### Technical Details

**AttendanceSlider Component Rewrite:**

```text
┌────────────────────────────────────────┐
│  ┌──────────────────────────────────┐  │
│  │       (Gradient Fade Top)        │  │
│  ├──────────────────────────────────┤  │
│  │          Absent                  │  │  ← Dimmed, smaller
│  ├──────────────────────────────────┤  │
│  │   ═══════════════════════════    │  │  ← Selection Band
│  │        ★ Present ★               │  │  ← Bold, scaled, primary color
│  │   ═══════════════════════════    │  │
│  ├──────────────────────────────────┤  │
│  │           Late                   │  │  ← Dimmed, smaller
│  ├──────────────────────────────────┤  │
│  │      (Gradient Fade Bottom)      │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Component Size:** `w-[120px] h-[132px]` (matching speed session picker proportions)

**Status Options Display:**
- Empty: "—" (muted)
- Present: "Present" (green when selected)
- Late: "Late" (yellow when selected)
- Absent: "Absent" (red when selected)
- Sick: "Sick" (blue when selected)
- Excused: "Excused" (purple when selected)

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/teacher/AttendanceSlider.tsx` | Complete redesign to match ScrollPicker style |
| `src/pages/TeacherClassAttendance.tsx` | Remove `fetchData()` call, use optimistic updates |

---

### Expected Outcome

1. **Visual:** Sleek, modern iOS-style picker matching the speed session design
2. **Performance:** Instant UI response when selecting attendance status (no lag)
3. **Consistency:** Unified design language across teacher and student interfaces

