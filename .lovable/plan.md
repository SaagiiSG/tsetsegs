

## Welcome Onboarding Tour for First-Time Students

### Current State
- There's already an `OnboardingSATModal` that asks students to pick their SAT date on first login
- It uses the `onboarding_completed` flag on `student_accounts` to show only once
- The SAT modal is triggered in `StudentLayout` before the student sees the dashboard

### Plan

**Replace the single SAT date modal with a multi-step welcome onboarding wizard** that guides students through the platform, ending with the SAT date selection.

#### New Component: `WelcomeOnboardingModal`
A multi-step dialog (4-5 slides) shown to first-time students (`onboarding_completed === false`). Each step highlights a key platform feature with an icon, title, and short description.

**Steps:**
1. **Welcome** -- "Welcome to Tsetsegs SAT Prep!" with a warm greeting using the student's first name
2. **Practice** -- Highlights Math & English practice modes (daily practice, smart practice, speed mode)
3. **Track Progress** -- Shows stats, leaderboard, badges, and streak tracking
4. **Book a Seat** -- Explains the seat booking feature for in-person sessions
5. **Set Your SAT Date** -- The existing SAT date picker (moved here as the final step)

**UI Details:**
- Step indicator dots at the bottom
- "Next" / "Back" navigation buttons
- "Skip" option that marks onboarding complete
- Animated transitions between steps using framer-motion
- Each step has a relevant Lucide icon in a colored circle and 1-2 line description

#### File Changes

1. **Create `src/components/student/WelcomeOnboardingModal.tsx`**
   - Multi-step dialog with the 5 steps above
   - Step 5 embeds the SAT date picker logic from the current `OnboardingSATModal`
   - On completion or skip, sets `onboarding_completed: true` on `student_accounts`

2. **Update `src/components/student/StudentLayout.tsx`**
   - Replace `OnboardingSATModal` import with `WelcomeOnboardingModal`
   - Same trigger logic (show when `onboarding_completed` is false and not a teacher/admin)

3. **Keep `OnboardingSATModal.tsx`** as-is (it may be used elsewhere for re-setting SAT date)

#### No Database Changes
Uses the existing `onboarding_completed` column on `student_accounts`.

