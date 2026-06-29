# Course-aware login + new IELTS prep section

Today, every student lands on `/practice` (SAT). IELTS-only students get blocked by `IELTSPracticeNotice`, and dual-enrolled (SAT + IELTS) students are silently funneled into SAT — which is also where the bug they're hitting lives. We'll split the login routing by course type and stand up an `/ielts` shell so IELTS students have a real home.

## User flow

```text
Enter phone
      │
      ▼
Lookup student records by phone
      │
 ┌────┴──────────────────────────────────┐
 │ SAT only         │ IELTS only         │ Both SAT + IELTS
 ▼                  ▼                    ▼
Password ──► /practice   Password ──► /ielts   Password
                                              │
                                              ▼
                                  Course chooser screen
                                  (SAT card | IELTS card)
                                              │
                          Remember choice ────┤
                                              ▼
                              /practice  or  /ielts
```

Inside both sections, the header gets a small "Switch course" button (only visible to dual-enrolled students) that flips them to the other section without logging out and updates the remembered choice.

## What we'll build

1. **Course detection at phone step** — `checkPhone` already finds the student; extend it to also return `courseTypes: ('SAT' | 'IELTS')[]` by joining `students → batches.course_type`. Store it alongside `pendingStudentAccount` so the next step knows where to send the user.

2. **Routing after login**
   - SAT only → `/practice/dashboard` (unchanged).
   - IELTS only → `/ielts/dashboard` (new).
   - Both → `/choose-course` (new), which writes `localStorage.preferred_course` and navigates. On subsequent logins we skip the chooser and go straight to the remembered course.
   - Replace the current `<Navigate to="/practice/dashboard" />` in `StudentPortal` with a small helper that reads course list + preferred choice.

3. **Fix the dual-enrolled crash** — Audit happens as part of step 1/2. The likely culprit is `useStudentCourses`/`IELTSPracticeNotice` interplay or the SAT-only assumptions in `StudentLayout` (`isIELTSOnly` gate). With dual students now routed correctly, we'll also harden `StudentLayout` so a dual student visiting `/practice` is never bounced to the IELTS notice, and add an error boundary around the dashboard so any future surprise renders a friendly fallback instead of a blank screen.

4. **New `/ielts` shell**
   - `IELTSLayout` — mirrors `StudentLayout` structure (sidebar + header + outlet) but trimmed: no SAT-specific widgets (no Desmos snap listener, no SAT streak/tier badges for now).
   - `IELTSSidebar` — single "Dashboard" item to start; placeholder items (Practice, Vocabulary, etc.) marked "Coming soon" and disabled.
   - `IELTSDashboardHome` — welcome card with the student's name + batch, and a "Coming soon" panel describing what's planned. Reuses existing announcements card if the student has IELTS announcements (no new schema).
   - Route guard: only students whose course list contains `'IELTS'` can enter `/ielts/*`; SAT-only students get redirected to `/practice`.

5. **Course chooser page** (`/choose-course`)
   - Two large cards: "SAT Practice" and "IELTS Prep" with subtitle + icon, matching the brand (coral pink / deep indigo, Chillax headings).
   - Clicking a card sets `localStorage.preferred_course = 'sat' | 'ielts'` and navigates.
   - Accessible to logged-in dual students only; SAT-only/IELTS-only students are auto-redirected.

6. **In-app course switcher**
   - Small header button in both `StudentLayout` and `IELTSLayout`, shown only when `linked_students` contains both course types. Updates `preferred_course` and navigates to the other section's dashboard. No logout, no re-auth.

## Technical notes

- **Files touched / added**
  - `src/contexts/StudentAuthContext.tsx` — add `courseTypes` to pending state; expose `preferredCourse` getter/setter backed by `localStorage`; small helper `getPostLoginRoute()`.
  - `src/pages/StudentPortal.tsx` — replace hard-coded `/practice/dashboard` redirect with the helper.
  - `src/App.tsx` — register `/ielts/*` and `/choose-course` routes.
  - `src/pages/ChooseCourse.tsx` *(new)*.
  - `src/components/ielts/IELTSLayout.tsx` *(new)*.
  - `src/components/ielts/IELTSSidebar.tsx` *(new)*.
  - `src/pages/ielts/IELTSDashboardHome.tsx` *(new)*.
  - `src/components/student/StudentLayout.tsx` — drop the `isIELTSOnly` redirect (now handled upstream), add CourseSwitcher button.
  - `src/components/student/IELTSPracticeNotice.tsx` — keep as a safety net but link to `/ielts` instead of being a dead-end.
  - `src/hooks/useStudentCourses.ts` — already returns `hasSAT/hasIELTS/isBoth`; reuse as-is, add a tiny `usePreferredCourse()` hook for the switcher.

- **No schema changes.** All course detection uses existing `students.batch_id → batches.course_type`. The IELTS shell has no new tables yet — we'll add them when scope expands beyond the shell.

- **Backwards compatibility.** Existing SAT-only students see zero change: same login, same redirect, same dashboard. IELTS-only students who were previously blocked at the SAT notice now land on `/ielts/dashboard`. Dual students stop crashing because they never hit the SAT-only render path that the current bug lives in.

- **Out of scope (call out so we don't drift):** real IELTS practice content, IELTS-specific badges/streaks, IELTS attendance views, separate password flows. Today is the shell + routing.
