

# Add Practice Test 11 Slot

## Overview
Add a 9th practice test slot displayed as "Test 11" to all pages that show SAT practice test scores. The SAT Mock label shifts from test_number 8 to test_number 9.

## Current State
- 8 practice test records per student (test_number 1-8)
- Labels: Test 4-10 (test_number 1-7 via `testNum + 3`), SAT Mock (test_number 8)
- `maxTests = 8` in TeacherStudentCards

## Changes

### Label Logic Update (all files)
- test_number 1-8 map to "Test 4" through "Test 11" (formula `testNum + 3` still works)
- test_number 9 becomes "SAT Mock" (was test_number 8)

### Files to Update

**1. `src/pages/TeacherStudentCards.tsx`**
- Change `maxTests` from 8 to 9 (line 198)
- Existing students who already have test_number 8 as SAT Mock won't be affected since the data stays; only the label changes

**2. `src/components/teacher/StudentCard.tsx`**
- Update `getTestLabel` function (appears twice, lines 642 and 747): change `testNum === 8` to `testNum === 9` for "SAT Mock"

**3. `src/pages/TeacherStudentProfile.tsx`**
- Update label logic (line 763): change `test.test_number === 7` to `test.test_number === 9` for "Real SAT Mock" (note: this file uses test_number 7 instead of 8, which appears to be a bug -- will fix to 9)
- Update chart label (line 366): same formula works, but need to handle SAT Mock label for test_number 9

**4. `src/components/student/PracticeTestScoreDrawer.tsx`**
- Change `.in('test_number', [1, 2, 3, 4, 5, 6, 7])` to `[1, 2, 3, 4, 5, 6, 7, 8]` (line 55)
- Update the loop from `[1, 2, 3, 4, 5, 6, 7]` to `[1, 2, 3, 4, 5, 6, 7, 8]` (line 145)
- Add SAT Mock label handling for test_number 9 (if the drawer is for test scores the student inputs, we may keep it at 8 editable tests and exclude SAT Mock)

**5. `src/pages/student/StudentDashboardHome.tsx`**
- Update filter range from `test_number <= 7` to `test_number <= 8` for average calculation (line 170)

**6. `src/pages/student/StudentShareProfile.tsx`**
- Label logic at line 383: formula `test.test_number + 3` already works for test 8 = "Test 11"; add SAT Mock label for test_number 9

**7. `src/components/teacher/intense-prep/IntensePrepGroupDetail.tsx`**
- Update `TEST_NUMBERS` from `[4, 5, 6, 7, 8, 9, 10]` to `[4, 5, 6, 7, 8, 9, 10, 11]` (line 63)

**8. `src/components/teacher/intense-prep/IntensePrepStudentRow.tsx`**
- Update hardcoded arrays `[4, 5, 6, 7, 8, 9, 10]` to `[4, 5, 6, 7, 8, 9, 10, 11]` (lines 160 and 177)
- Update test count display from `/7 tests` to `/8 tests` (line 157)

**9. `src/components/teacher/BatchAnalytics.tsx`**
- Review and update any hardcoded test number ranges

**10. `src/pages/admin/AdminBatchAnalytics.tsx`**
- Review and update any hardcoded test number ranges

**11. `src/components/teacher/StudentAlertsTab.tsx`**
- No hardcoded ranges found; fetches all practice tests dynamically -- no changes needed

**12. `src/components/teacher/StudentCardSkeleton.tsx`**
- Update skeleton `length: 8` to `length: 9` for the test grid (line 50)

## Data Considerations
- Existing students won't have a test_number 9 record yet. The TeacherStudentCards page creates empty slots dynamically via `Array.from({ length: maxTests })`, so the new slot will appear as empty automatically.
- The upsert logic in `handleTestScoreChange` creates records on demand, so no migration is needed for data.
- No database schema changes required -- `test_number` is an integer column with no constraints limiting it to 8.

## Impact on SAT Mock Data
- Students who currently have a score in test_number 8 labeled "SAT Mock" will now see it labeled "Test 11". Their SAT Mock slot (test_number 9) will be empty.
- If there's existing SAT Mock data that needs to be preserved under the correct label, a data migration (UPDATE practice_tests SET test_number = 9 WHERE test_number = 8) could be run. This depends on whether existing test_number 8 data is truly "SAT Mock" or "Test 11" practice scores.

