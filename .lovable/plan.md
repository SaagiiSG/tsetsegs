

## Make the Last Page of Closing Report Admin-Editable

### What Changes
The thank-you slide (slide 5) currently has hardcoded text. We'll store the closing message in the database so admins can edit it from Admin Settings.

### Plan

**1. Database Migration — Create `closing_report_settings` table**
- Columns: `id`, `heading` (text, default "Thank You, {name}!"), `body` (text, default the current paragraph), `sign_off` (text, default "See you on the review session! 🚀"), `updated_at`
- Single-row config table (use upsert pattern)
- RLS: authenticated users can read; admin role can update

**2. Admin UI — Add editor in Admin Settings page**
- Add a "Closing Report Message" card/section in AdminSettings
- Three editable fields: Heading, Body message, Sign-off line
- Mention `{name}` as a placeholder that gets replaced with the student's first name
- Save button that upserts the single row

**3. Update `ClosingReportContent` component**
- Fetch `closing_report_settings` (fallback to current hardcoded defaults if no row exists)
- Replace hardcoded text on slide 5 with the fetched values
- Replace `{name}` placeholder with `data.studentName.split(' ')[0]`

**4. Update `PublicClosingReport` to also pass/fetch the settings** so the public shared link shows the same custom message.

### Files to Modify
- **New migration** — `closing_report_settings` table
- `src/pages/AdminSettings.tsx` — Add message editor section
- `src/pages/student/StudentClosingReport.tsx` — Fetch settings, use dynamic text on slide 5
- `src/pages/PublicClosingReport.tsx` — Pass settings through to `ClosingReportContent`

