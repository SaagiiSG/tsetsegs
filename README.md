# Tsetsegs SAT Prep — Platform Reference

> **SAT & IELTS prep platform for Mongolian students**
> Production: [flowersos.co](https://flowersos.co) · [tsetsegs.lovable.app](https://tsetsegs.lovable.app)
> Lovable project: [b17aa099-0564-465a-8bde-ea42ea79d257](https://lovable.dev/projects/b17aa099-0564-465a-8bde-ea42ea79d257)

Tsetsegs SAT Prep is a closed-loop test-prep platform built for an in-person Mongolian tutoring program. It unifies an admin-managed question bank, teacher classroom tooling (attendance, alerts, live practice), and a gamified student practice portal — all wired to a single Lovable Cloud (Supabase) backend. The platform is designed for an internally trusted user base: students cannot self-onboard unless their phone number has been pre-loaded by an admin.

---

## 1. Audience & Access Model

| User type | Identifier | Onboarded by | Portal |
|-----------|-----------|--------------|--------|
| **Admin** | Email + password | Manually (Supabase Auth + `user_roles`) | `/admin/*` |
| **Teacher** | Username + password | Admin via `setup-teacher-accounts` edge function | `/teacher/*` |
| **Student** | Phone + password | Admin pre-loads phone → student self-registers | `/practice/*` |

**Trust model:** This is *not* a public SaaS. Only students whose phone numbers exist in the `students` table can create a `student_accounts` record. New review-program students onboard through a teacher-generated QR link that pre-binds them to a specific batch.

---

## 2. Tech Stack

**Frontend**
- Vite 5 · React 18 · TypeScript 5
- Tailwind CSS v3 + shadcn/ui (Radix primitives)
- React Router v6 · TanStack Query v5
- next-themes (light/dark + tier-based theme variants)

**Animation & Visual**
- Framer Motion (page transitions, modal choreography)
- GSAP (closing report, hero moments)
- Three.js + react-three-fiber (landing FloatingLines, DomeGallery) — see `src/components/reactbits/`. React must be deduped via Vite alias to avoid `useEffect` null errors.
- Recharts (analytics dashboards)

**Math rendering**
- KaTeX for display
- MathQuill for admin question authoring (`src/components/admin/questions/MathQuillEditor.tsx`)
- Custom `MathText` component (`src/components/MathText.tsx`) protects literal `$` currency from being parsed as LaTeX delimiters and renders pure-numeric LaTeX spans verbatim.

**Backend (Lovable Cloud / Supabase)**
- Postgres with strict RLS
- Supabase Auth (admins only — students/teachers use custom flows)
- Edge Functions (Deno) for privileged operations
- Storage (question images, screenshots, profile assets)
- Realtime (live practice sessions, leaderboards)

**External integrations**
- Twilio — SMS via edge functions (welcome, password reset, custom blasts)
- Desmos — embedded graphing calculator (`DesmosCalculator.tsx`)
- YouTube — video timestamp deep-links on 68-set questions

---

## 3. Top-Level Architecture

```text
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│   Admin     │  │   Teacher    │  │   Student    │
│  /admin/*   │  │  /teacher/*  │  │  /practice/* │
└──────┬──────┘  └──────┬───────┘  └──────┬───────┘
       │ AuthContext    │ TeacherAuth     │ StudentAuth
       └────────┬───────┴─────────┬───────┘
                ▼                 ▼
       ┌─────────────────────────────────┐
       │   Lovable Cloud (Supabase)      │
       │  Postgres │ Auth │ Edge │ Storage│
       └─────────────────────────────────┘
                ▼
       Twilio SMS · Desmos · YouTube
```

Three independent auth contexts coexist in a single React tree (`App.tsx`), each guarding its own route subtree. All three speak to the same Postgres schema, partitioned by RLS.

---

## 4. Routing Map

All routes live in `src/App.tsx`.

### Public
| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `Index` | Landing page (golden theme, MON/ENG toggle) |
| `/login` | `Login` | Unified admin + teacher login (tabbed) |
| `/student-register` | `StudentRegistration` | Phone-number self-registration (must exist in DB) |
| `/register` | `ReviewRegistration` | Batch-bound QR onboarding form |
| `/report/:token` | `PublicClosingReport` | Parent-shareable end-of-course report |
| `/live/:joinCode` | `LiveSession` | Kahoot-style student join screen |
| `/student/:id`, `/batch/:id` | `StudentReveal` | Animated reveal cards |
| `/student/share/:shareToken` | `StudentShareProfile` | Parent-shareable student profile |
| `/teacher/newyear/:teachername` | `NewYearCard` | Seasonal greeting card |

### Admin (`ProtectedRoute`)
| Path | Component |
|------|-----------|
| `/admin/*` | `Admin` (nested: dashboard, batches, teachers, students, question-bank, analytics, sprint-monitor, bluebook-manager, sat-schedule, bug-reports, settings) |
| `/register/admin` | `ReviewRegistrationAdmin` |

### Teacher (`TeacherProtectedRoute`)
| Path | Component | Purpose |
|------|-----------|---------|
| `/teacher/dashboard` | `TeacherDashboard` | Batch list + alerts |
| `/teacher/class/:batchId` | `TeacherClassAttendance` | Attendance grid |
| `/teacher/students/:batchId` | `TeacherStudentCards` | Per-batch student cards |
| `/teacher/students` | `TeacherAllStudents` | Cross-batch search |
| `/teacher/student/:studentId` | `TeacherStudentProfile` | Individual student deep-dive |
| `/teacher/analytics/:batchId` | `TeacherClassAnalytics` | Class performance |
| `/teacher/wrapped/:batchId` | `TeacherClassWrapped` | "Flowers Wrapped" recap |
| `/teacher/settings` | `TeacherSettings` | Profile + password |
| `/teacher/change-password` | `TeacherChangePassword` | Forced first-login change |

### Student (`StudentLayout` shell — bottom nav + sidebar)
| Path | Component |
|------|-----------|
| `/practice` | `StudentPortal` (entry / login) |
| `/practice/home` | `StudentDashboardHome` |
| `/practice/dashboard` | `StudentPractice` (subject hub) |
| `/practice/bluebook` | `StudentBluebook` |
| `/practice/bluebook/test/:attemptId` | `StudentBluebookTest` (full-screen, **outside** layout) |
| `/practice/speed`, `/practice/speed/session` | Speed mode + session |
| `/practice/review` | `StudentReview` (spaced repetition queue) |
| `/practice/stats` | `StudentStats` |
| `/practice/leaderboard` | `StudentLeaderboard` |
| `/practice/badges` | `StudentBadges` |
| `/practice/profile` | `StudentProfile` |
| `/practice/settings` | `StudentSettings` |
| `/practice/vocabulary` | `StudentVocabulary` |
| `/practice/smart` | `StudentSmartPractice` |
| `/practice/reading` | `StudentReadingModule` |
| `/practice/booking` | `StudentBooking` |
| `/practice/bug-report` | `StudentBugReport` |
| `/practice/closing-report` | `StudentClosingReport` |
| `/practice/question/:questionId` | `StudentQuestion` (math) |
| `/practice/english/question/:questionId` | `StudentEnglishQuestion` |

---

## 5. Directory Structure

```text
src/
├── App.tsx                     # Router + 3 auth providers + theme bootstrap
├── main.tsx
├── index.css                   # Tailwind layers + HSL design tokens + tier themes
│
├── pages/                      # Route-level components
│   ├── admin/                  # Admin sub-pages (analytics, question bank, sprint monitor…)
│   ├── student/                # All /practice/* pages
│   ├── teacher/                # Teacher sub-pages (TeacherClassWrapped, etc.)
│   ├── Login.tsx, Index.tsx, Admin.tsx, NotFound.tsx
│   ├── StudentPortal.tsx, StudentQuestion.tsx, StudentReveal.tsx
│   ├── TeacherDashboard.tsx, TeacherClassAttendance.tsx, …
│   ├── ReviewRegistration.tsx, StudentRegistration.tsx
│   ├── PublicClosingReport.tsx, LiveSession.tsx, NewYearCard.tsx
│
├── components/
│   ├── admin/                  # Admin UI (batch mgmt, question forms, analytics tabs)
│   │   ├── analytics/          # Overview, QuestionHealth, StudentDeepDive sub-tabs
│   │   ├── bluebook/           # Test builder + module cards
│   │   ├── dashboard/          # Hero stats, sprint preview, weak spots
│   │   └── questions/          # MathQuillEditor, ImageCropper, CB import flow
│   ├── student/                # StudentLayout, sidebar, bottom nav, modals
│   │   ├── analytics/          # WeaknessIdentifier, ErrorPatternTracker, etc.
│   │   ├── badges/             # Grid, filters, detail modal
│   │   ├── leaderboard/        # Tabs, celebrations, sprint timer
│   │   └── profile/            # Featured badges, level card, heatmap
│   ├── teacher/                # StudentCard, AttendanceSlider, NudgeButton
│   │   ├── intense-prep/       # Spreadsheet-like group tracking
│   │   ├── live-practice/      # Lobby, live leaderboard, question control
│   │   └── practice/           # TeacherPracticeHub (browse + viewer)
│   ├── ui/                     # shadcn primitives — DO NOT customize colors here
│   ├── reactbits/              # Aurora, BlurText, GradientText, ScrollStack, etc.
│   ├── security/               # WatermarkOverlay, useDevToolsDetection, useSecurityEvents
│   ├── MathText.tsx            # ⭐ Currency-safe LaTeX renderer
│   ├── ProtectedRoute.tsx      # Admin guard
│   └── TeacherProtectedRoute.tsx
│
├── contexts/
│   ├── AuthContext.tsx         # Admin (Supabase email auth)
│   ├── TeacherAuthContext.tsx  # Teacher (custom username flow)
│   └── StudentAuthContext.tsx  # Student (phone+password, single session)
│
├── hooks/                      # Domain hooks
│   ├── useAdaptivePractice.ts  # ⭐ Adaptive question selection
│   ├── useAdminAnalytics.ts, useAdminDashboard.ts
│   ├── useBadges.ts, useBadgeProgressCalculator.ts, useSyncBadgeProgress.ts, useSpeedBadgeProgress.ts
│   ├── useLeaderboard.ts, useStudentTier.ts
│   ├── useScorePrediction.ts, useScoreTarget.ts
│   ├── useStudentAnalytics.ts, useStudentProfile.ts, useStudentStreak.ts
│   ├── useRiskCalculation.ts, useFeatureFlags.ts
│   └── useOtherStudentProfile.ts, useMarqueeSelection.ts
│
├── lib/
│   ├── adaptiveSelection.ts    # ⭐ Weighted selection algorithm
│   ├── classUtils.ts           # Batch-status helpers (SAT vs IELTS rules)
│   ├── errorUtils.ts
│   └── utils.ts                # cn() for Tailwind class merging
│
├── data/
│   ├── badgeDefinitions.ts     # ⭐ 22 badge definitions + tracking metadata
│   └── satVocabulary.ts        # Static SAT word list seed
│
└── integrations/supabase/
    ├── client.ts               # AUTO-GENERATED — do not edit
    └── types.ts                # AUTO-GENERATED schema types — do not edit

supabase/
├── config.toml                 # Project-level config (do not modify project_id)
├── migrations/                 # READ-ONLY — managed by migration tool
└── functions/                  # Deno edge functions (auto-deployed)
    ├── create-teacher-account/
    ├── delete-student/
    ├── delete-teacher-account/
    ├── finalize-sprint/        # Sprint rankings, badge awards, auto-enroll
    ├── generate-variations/    # AI question variations
    ├── log-ip/                 # Security event logging
    ├── parse-cb-question/      # CollegeBoard PDF/image → structured Q
    ├── parse-english-question/ # English question parser
    ├── reset-teacher-password/
    ├── setup-teacher-accounts/
    └── sync-external-questions/
```

---

## 6. Authentication Architecture

Three auth contexts, all mounted in `App.tsx`, each gating its own portal:

| | **AuthContext** (Admin) | **TeacherAuthContext** | **StudentAuthContext** |
|---|---|---|---|
| Identifier | Email | Username | Phone (E.164) |
| Backing store | Supabase `auth.users` + `user_roles` | `teachers` table (custom) | `student_accounts` table (custom) |
| Session storage | Supabase JWT | localStorage token | localStorage token |
| Role check | `has_role(uid, 'admin')` security-definer fn | `teacher_id` presence + active flag | `student_account_id` + linked `students.id` |
| Multi-session | Allowed | Allowed | **Forbidden** — single active session |
| Device lock | None | None | **90-day device fingerprint lock** (bypassable for staff/dev accounts) |
| Guard component | `ProtectedRoute` | `TeacherProtectedRoute` | Inline in `StudentPortal` |

**Phone-linking flow:** On student login, `student_accounts.phone` is matched against `students.phone`. The resulting `students.id` powers attendance, batch membership, score history — everything pre-existing the practice portal. This separation is critical: `students` is the registrar's source of truth; `student_accounts` is the practice-portal identity.

**`user_roles` pattern:** Roles are stored in a separate `user_roles` table (never on profiles). All RLS policies use `public.has_role(auth.uid(), 'admin')` — a `SECURITY DEFINER` function — to avoid recursive RLS.

---

## 7. Core Domain Systems

### 7.1 Question Bank
- **Subjects:** `math`, `english` (column on `questions`).
- **Sets (`question_set`):** `CB` (CollegeBoard catch-all for originals), `68` (PrepPros 68 essentials), `150` / `SATMathTraining800` (PrepPros 150 hard), `Bluebook` (full-test builder), plus English-specific sets.
- **Imports:** Admins paste raw text/images into `CBQuestionImport`/`EnglishQuestionImport`. The `parse-cb-question` and `parse-english-question` edge functions structure them. Dedup by `original_cb_id` or `question_id` before insert.
- **Authoring:** `QuestionForm` and `CBQuestionForm` use `MathQuillEditor` for inline LaTeX entry; `ImageCropper` (react-image-crop) refines uploaded figures.
- **Image-based choices:** `choice_images` JSONB column allows MC options to be images.
- **Video timestamps:** 68-set questions accept a `mm:ss` start time and deep-link YouTube videos.
- **Fill-in alternates:** `alternate_answers TEXT[]` accepts equivalent forms (e.g. `0.5`, `1/2`, `.5`).
- **Variations:** `ai_variations` table holds AI-regenerated versions of parent questions for review.

### 7.2 Practice Engine
- **Adaptive selection:** `src/lib/adaptiveSelection.ts` weights candidates by recency, accuracy, topic mastery, and tier. `useAdaptivePractice` orchestrates the queue.
- **Spaced repetition:** SM-2 schedule per (student, question) for the Review queue.
- **Attempt scoring:** Correct on attempt 1/2/3 = **10/5/2 points**; unlimited retries after that yield 0 but still update mastery.
- **Bottom action bar:** Rendered into a `body`-mounted React portal so it survives page-level scroll containers (see `architecture/student-practice-ui-portals` memory).
- **68-set quirk:** Every variation is treated as a *standalone* question — they appear as independent problems in the queue.

### 7.3 MathText Rendering (`src/components/MathText.tsx`)
KaTeX with custom delimiter handling:
1. Literal `$` adjacent to digits or letters (currency) is escaped before parsing.
2. Pure-numeric LaTeX spans (`$3$`, `$92.16$`, `$27,000$`) render as plain text — no synthesized `$` prefix.
3. Real LaTeX (`$x^2 + 3x$`, `$\frac{a}{b}$`) renders via KaTeX.
4. Convention: question authors should write currency as `"160 dollars"` rather than `"$160"` to avoid ambiguity.

### 7.4 Gamification
- **Points:** Logged in `point_transactions` with `category` (`practice`, `speed`, `streak`, `sprint_bonus`, …).
- **Levels:** `floor(log2(totalPoints / 100) + 1)` — exponential.
- **Tiers:** Bronze → Silver → Gold → Platinum → Emerald (drives `useStudentTier` and the dynamic theme).
- **Badges:** 22 definitions in `src/data/badgeDefinitions.ts` with auto-tracking (`useSyncBadgeProgress`). Categories: time-based (ruby_weeks), rank-based (top_1_weeks), mastery, speed, streak, seasonal.
- **Streaks:** `student_streaks` table; current/longest tracked daily.
- **Featured badges:** Students pin up to 3 to their profile via `featured_badges`.

### 7.5 Sprints & Leaderboard
- **Seasons:** 3 sprints per season, 7–28 days each.
- **Group isolation:** Within each tier, students are partitioned into independent competitive groups (target ~40, ±15) to keep leaderboards meaningful at scale.
- **`finalize-sprint` edge function:** Runs at sprint end → computes rankings → awards rank badges → auto-enrolls students into next sprint → triggers SMS/celebrations.
- **No active sprint:** `NoActiveSprintCard` falls back to displaying the student's most recent sprint result.

### 7.6 Analytics
- **Student** (`StudentStats`): Subject-specific radar charts, weakness identifier, error-pattern tracker, time-efficiency dashboard, consistency score, goal-gap tracker.
- **Teacher** (`TeacherClassAnalytics`, `BatchAnalytics`): Per-batch performance, alert system (3+ missed classes / 3+ incomplete homeworks), switched-student warnings (cross-batch duplicate detection by name+phone).
- **Admin** (`/admin/analytics`): Three-tab dashboard:
  - **Overview** — hero stats, activity heatmap, weak spots, sprint preview, at-risk quick view.
  - **Question Health** — flagged questions, time outliers, difficulty calibration alerts, wrong-answer patterns.
  - **Student Deep Dive** — full per-student profile with risk, score prediction, behavior tabs.
- **Risk score:** `30%` login recency · `25%` accuracy decline · `20%` engagement drop · `15%` topic struggle · `10%` homework completion (see `useRiskCalculation`).
- **SAT score prediction:** 20-point range calibrated against actual SAT outcomes (`useScorePrediction`, see memory).

### 7.7 Bluebook Simulator
Replicates the official digital SAT:
- 4 modules (RW1, RW2, Math1, Math2) with adaptive M2 difficulty.
- Per-module timers, mark-for-review, navigator dialog, reference sheet, Desmos.
- Scaled scoring per module → composite. Results in `BluebookResultsDialog`.
- Test builder in admin (`BluebookTestBuilder` + `BluebookQuestionSelector`).

### 7.8 Live Practice (Kahoot-style)
- Teacher creates session → 6-char `join_code`.
- Students join at `/live/:joinCode` (no login required — phone + name).
- Realtime via Supabase channels: lobby roster → question reveal → live leaderboard.
- Tables: `live_sessions`, `live_session_participants`, `live_session_questions`, `live_session_answers`.

### 7.9 Closing Reports
SAT-program graduates receive a 6-page animated recap: Intro → Stats → First Mock → High Score → Improvement → Thank You. Tokens in `closing_report_tokens` enable parent-shareable URLs (`/report/:token`).

### 7.10 Registration & QR Onboarding
- Teachers generate `registration_codes` (batch-bound, expiring).
- Students fill `/register?code=…` → row added to `registration_requests` with `is_review_student` flag.
- Approval queue at `/register/admin` (admin or teacher) accepts/rejects; on accept, a `students` row + optional `student_accounts` row are created and bound to the batch.

### 7.11 Security
- **Devtools detection** (`useDevToolsDetection`) — guards against zoom/mobile false positives.
- **Content blur** on tab/window blur.
- **Watermark overlay** (`WatermarkOverlay`) — student name + timestamp diagonal, repeating.
- **Single active session** + 90-day device lock.
- **Staff bypass** — teacher/admin accounts skip device lock and watermark for QA access.
- All security events log to `security_alerts`.

### 7.12 Vocabulary
`vocabulary_words` with composite unique constraint `(word, subject)` so the same word can exist in math (e.g. *intersect*) and English contexts.

### 7.13 Feature Flags
`public.feature_flags` table (`feature_key`, `is_enabled`) consumed by `useFeatureFlags`. Used for dark-launches and partial rollouts. Manage via `FeatureFlagsManager` in admin settings.

### 7.14 SMS Automation
Twilio-backed edge functions for: welcome message on account creation, password reset codes, ad-hoc admin blasts. All credentials live in Supabase secrets — never in client code.

### 7.15 Reading Module
`StudentReadingModule` groups English questions by passage and lets students work through a passage's questions in sequence — closer to the real SAT RW experience.

### 7.16 Desmos Calculator
Floating, draggable, resizable window in math practice. Snap zones on left/right edges; left-snap collapses the sidebar to maximize working space.

---

## 8. Data Model Highlights

Auto-generated TypeScript types live in `src/integrations/supabase/types.ts` (read-only). Key tables grouped by domain:

**Identity & access**
`user_roles`, `teachers`, `students`, `student_accounts`, `registration_codes`, `registration_requests`

**Content**
`questions`, `question_categories`, `ai_variations`, `question_flags`, `bluebook_tests`, `bluebook_modules`, `bluebook_module_questions`, `vocabulary_words`

**Attempts & progress**
`question_attempts`, `bluebook_attempts`, `bluebook_answers`, `student_question_mastery`, `student_streaks`

**Gamification**
`badges`, `student_badges`, `featured_badges`, `point_transactions`, `sprints`, `sprint_participants`, `seasonal_events`

**Classroom**
`batches`, `attendance`, `homework`, `practice_tests`, `curriculum_templates`, `curriculum_sessions`, `homework_assignments`, `homework_questions`, `schedule_templates`

**Operations**
`feature_flags`, `bug_reports`, `security_alerts`, `closing_report_tokens`, `closing_report_settings`, `seat_bookings`, `review_sessions`, `review_session_templates`, `booking_bans`

**Live & intense prep**
`live_sessions`, `live_session_participants`, `live_session_questions`, `live_session_answers`, `intense_prep_groups`, `intense_prep_members`, `intense_prep_tracking`

---

## 9. Edge Functions

| Function | Trigger | Purpose | Secrets |
|----------|---------|---------|---------|
| `create-teacher-account` | Admin UI | Provision teacher with username + temp password | `SUPABASE_SERVICE_ROLE_KEY` |
| `setup-teacher-accounts` | Admin UI (bulk) | Batch-create teacher accounts | service role |
| `reset-teacher-password` | Admin UI | Reset teacher password + notify | service role, Twilio |
| `delete-teacher-account` | Admin UI | Cascade-safe teacher deletion | service role |
| `delete-student` | Admin UI | Cascade-safe student + account deletion | service role |
| `finalize-sprint` | Cron / sprint end | Compute rankings, award badges, auto-enroll next sprint | service role, Twilio |
| `generate-variations` | Admin (per-question) | AI question variation generation | Lovable AI Gateway |
| `parse-cb-question` | Admin import | Structure CollegeBoard raw paste/image | Lovable AI Gateway |
| `parse-english-question` | Admin import | Structure English raw paste | Lovable AI Gateway |
| `sync-external-questions` | Manual / scheduled | Pull from external DB, dedup-skip existing | service role |
| `log-ip` | Client beacon | Record IP for security audit | service role |

All functions auto-deploy on save — no manual `supabase functions deploy` step.

---

## 10. Cross-Component Wiring (User-Flow Lens)

### Student answers a question
```
StudentQuestion.tsx
  → useAdaptivePractice (hook)
    → adaptiveSelection.ts (next pick)
  → submit → DB insert into question_attempts
  → useSyncBadgeProgress (re-evaluates 22 badges)
  → point_transactions insert (10/5/2 pts)
  → useLeaderboard invalidates → sprint rank recompute
  → bottom-bar portal renders Next button
```

### Teacher marks attendance
```
TeacherClassAttendance.tsx
  → AttendanceSlider (mobile tap-to-cycle)
  → MemoizedAttendanceSlider (prevents re-render flicker)
  → optimistic update → DB upsert into attendance
  → classUtils.ts recomputes batch status (SAT: 24 sessions, IELTS: session_24)
  → StudentAlertsTab re-evaluates 3+ missed → alert
```

### Admin imports questions
```
CBQuestionImport.tsx
  → paste raw → parse-cb-question edge fn (Lovable AI)
  → CBImportReviewSessions UI (per-question review)
  → dedup check by original_cb_id
  → insert into questions + log to cb_import_sessions
```

### Sprint ends
```
finalize-sprint edge fn
  → rank by sprint_participants.points
  → award rank badges (top_1_weeks, top_10_weeks, …)
  → close current sprint, create + seed next sprint
  → group-isolation rebalancing (target 40, ±15)
  → SMS celebration to top finishers
  → frontend SprintEndCelebration modal on next login
```

---

## 11. Theming & Design System

- **Brand:** Coral pink (`--primary`) + deep indigo accents.
- **Typography:** Chillax (display/headings) + JetBrains Mono (numbers/code) + Inter (body).
- **Tier-based dynamic theming:** `useStudentTier` swaps HSL variables at runtime via `next-themes` so a Platinum student sees a distinct palette from a Bronze one — supported in both light and dark modes.
- **Tokens only:** Components must consume semantic tokens (`bg-primary`, `text-foreground`, `border-border`) — never literal Tailwind colors. All tokens are HSL.
- **Aesthetic rule:** Avoid AI-slop defaults. Hero moments use GSAP / Three.js (see `reactbits/`) over generic Framer fades.

---

## 12. Local Development

```sh
npm i
npm run dev      # Vite dev server with HMR
npm run build    # Production build
npm run lint
```

**Files you must NOT edit manually** (auto-managed by Lovable Cloud):
- `.env`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/*` (use the migration tool)

The Lovable Cloud backend is provisioned automatically — no separate Supabase account required.

---

## 13. Deployment

- Publish from the Lovable editor → builds and deploys to `tsetsegs.lovable.app`.
- Custom domain `flowersos.co` configured in Project → Settings → Domains.
- Edge functions deploy automatically on save.
- Database migrations apply via the in-editor migration tool (no manual SQL run).

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| **Sprint** | A single competitive cycle (7–28 days) where students earn ranked points. |
| **Season** | A series of 3 consecutive sprints. |
| **Tier** | Skill bracket (Bronze / Silver / Gold / Platinum / Emerald) driving group isolation and theming. |
| **68 set** | PrepPros 68 essential SAT math problems — variations are standalone. |
| **150 set** | PrepPros 150 hard SAT math problems (DB id `SATMathTraining800`). |
| **CB set** | CollegeBoard catch-all — all original SAT questions not assigned to a specialized set. |
| **Bluebook** | Full-length adaptive SAT simulator (4 modules, scaled scoring). |
| **Closing Report** | 6-page animated end-of-course recap, parent-shareable. |
| **Intense Prep** | Spreadsheet-style group tracking for short, focused prep cohorts. |
| **Review Session** | In-person review class with movie-theater seat booking. |
| **Switched Student** | Student detected in 2+ batches by name+phone — flagged for teacher reconciliation. |
| **Featured Badge** | One of up to 3 badges a student pins to their profile. |

---

*Built on [Lovable](https://lovable.dev) — Vite · React · TypeScript · Tailwind · shadcn/ui · Lovable Cloud.*
