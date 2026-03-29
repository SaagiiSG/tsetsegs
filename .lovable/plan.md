

## Auto-Show Closing Report Popup on Student Login

### Problem
Students currently have to navigate to `/practice/closing-report` manually. The closing report should automatically pop up as a dialog when a student logs in after their 5-week SAT class ends.

### How It Works

**Trigger Logic**: When a student lands on their dashboard, check if their batch's final session (session_15 for SAT) is marked in the attendance table. If yes, and the `closing_reports` feature flag is enabled, show the closing report as a full-screen dialog automatically.

**Dismiss Logic**: Store a `closing_report_dismissed` flag in localStorage (keyed by student ID) so it only auto-shows once. Students can re-access it from a banner/button on their dashboard afterward.

### Implementation

**Step 1: Add auto-popup logic to `StudentDashboardHome.tsx`**
- On mount, query the student's attendance record to check if `session_15` is not null (batch completed)
- Check the `closing_reports` feature flag
- Check localStorage for dismissal
- If all conditions met, show a full-screen `Dialog` containing the existing `ClosingReportContent` component

**Step 2: Add a "View Your Report" banner**
- When the batch is completed and the report is available, show a small persistent card/banner on the dashboard that lets students re-open the report anytime
- Only visible for SAT students with completed batches

**Step 3: Reuse existing components**
- Import `ClosingReportContent` and `useClosingReportData` from `StudentClosingReport.tsx` (already exported)
- Fetch `closing_report_settings` for the customized text
- Generate/fetch share token same as the standalone page does

### Files to Modify
- `src/pages/student/StudentDashboardHome.tsx` — Add dialog with closing report auto-popup + re-open banner
- No database changes needed — all data (attendance, tokens, settings) already exists

