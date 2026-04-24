

## Plan: Expand README.md into a comprehensive platform reference

Rewrite `README.md` as a deep, structural reference for **Tsetsegs SAT Prep** — covering not just *what* exists, but *how pieces connect*, *which files own which logic*, and *which user flows cross which components*. Target ~500–700 lines of markdown.

### Section-by-section outline

1. **Header & Identity**
   - Product name, tagline (SAT/IELTS prep for Mongolian students), production URLs (`flowersos.co`, `tsetsegs.lovable.app`), Lovable project link.
   - One-paragraph mission statement.

2. **Audience & Access Model**
   - Internal-trust model: only students whose phone numbers are pre-loaded by admins can register.
   - Three user types: Admin (email), Teacher (username), Student (phone).
   - QR-based onboarding for new students via teacher-generated batch links.

3. **Tech Stack (detailed)**
   - Frontend: Vite 5, React 18, TypeScript 5, Tailwind v3, shadcn/ui, React Router v6, TanStack Query v5.
   - Animation/Visual: Framer Motion, GSAP, Three.js (with React dedupe note), Recharts.
   - Math: KaTeX (rendering) + MathQuill (admin input) + custom `MathText` component with currency-protection logic.
   - Backend: Lovable Cloud (Supabase) — Postgres, Auth, Storage, Edge Functions, Realtime.
   - External: Twilio (SMS via edge functions), Desmos (calculator embed), YouTube (video timestamps).

4. **Top-Level Architecture Diagram** (ASCII)
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
   ```

5. **Routing Map (annotated)**
   - Full route tree from `App.tsx` grouped by portal, each with: path, component file, guard (`ProtectedRoute` / `TeacherProtectedRoute` / public), and one-line purpose.
   - Public routes: `/`, `/login`, `/register`, `/registration`, `/report/:token`, `/live/:joinCode`, `/reveal`, `/newyear`.

6. **Directory Structure (annotated tree)**
   - Full `src/` and `supabase/` tree with a one-liner per folder AND callouts on important files (e.g., `lib/adaptiveSelection.ts`, `data/badgeDefinitions.ts`, `hooks/useStudentTier.ts`).

7. **Authentication Architecture**
   - Three parallel contexts (`AuthContext`, `TeacherAuthContext`, `StudentAuthContext`) — table comparing: storage, identifier, role-check mechanism, session model, device-lock behavior.
   - Phone-linking flow: `student_accounts` ↔ `students` table joined by phone.
   - Single-active-session enforcement and 90-day device lock.
   - `user_roles` table pattern with `has_role` security-definer function.

8. **Core Domain Systems** (one subsection each, ~20–40 lines)
   - **Question Bank** — subjects (Math/English), sets (CB, 68, 150, Bluebook), import flows, image cropping, image-based choices, video timestamps, fill-in alternates, MathQuill editor.
   - **Practice Engine** — `useAdaptivePractice`, `adaptiveSelection.ts` weights, SM-2 spaced repetition, attempt progression (10/5/2 points, unlimited retry), portal-based bottom action bar.
   - **MathText Rendering** — currency protection, numeric span handling, KaTeX delimiters, the recent fixes for `$4x^2+...$` and `$92.16$` cases.
   - **Gamification** — points/leveling formula (`log2`), tiers (Bronze→Platinum/Emerald), 22 badges with auto-tracking, study streaks, seasonal events.
   - **Sprints & Leaderboard** — 3-sprint seasons, ±15 target-40 group isolation, `finalize-sprint` edge function, auto-transition at midnight, fallback display when inactive.
   - **Analytics** — student (radar charts, weakness ID, error patterns), teacher (batch analytics, alerts, switched-student warnings), admin (Overview/Question Health/Student Deep Dive tabs, risk score formula 30/25/…, score prediction).
   - **Bluebook Simulator** — 4 modules, scaled scoring, results dialog.
   - **Live Practice** — Kahoot-style join code, lobby, leaderboard, realtime updates.
   - **Closing Reports** — 6-page animated summary, parent-share tokens.
   - **Registration & QR Onboarding** — batch-locked links, `is_review_student` flag, approval queue.
   - **Security** — devtools detection (with zoom/mobile false-positive guards), content blur on focus loss, watermark overlay, single-session, staff bypass.
   - **Vocabulary** — composite unique constraint, math + English entries.
   - **Feature Flags** — `public.feature_flags` table gating partial rollouts.
   - **SMS Automation** — Twilio edge function workflows (welcome, password reset, custom).
   - **Reading Module** — passage-grouped questions UI.
   - **Desmos Calculator** — draggable/snap-zone window, left-snap collapses sidebar.

9. **Data Model Highlights**
   - List of key tables grouped by domain (auth, content, attempts, gamification, batches, analytics).
   - Note that types are auto-generated in `src/integrations/supabase/types.ts` and must not be edited.

10. **Edge Functions** (table)
    - Every function in `supabase/functions/` with: name, trigger, purpose, secrets used.

11. **Cross-Component Wiring (user-flow lens)**
    - **"Student answers a question"** — page → portal → adaptive hook → DB write → points hook → badge sync → leaderboard recalc.
    - **"Teacher marks attendance"** — mobile tap-to-cycle → optimistic update → batch status recompute → alert system trigger.
    - **"Admin imports questions"** — paste → parse edge function → review dialog → insert with dedup by `original_cb_id`.
    - **"Sprint ends"** — finalize edge function → rankings → badge awards → auto-enroll next sprint → email/SMS.

12. **Theming & Design System**
    - Coral pink + deep indigo, Chillax/JetBrains Mono, tier-driven HSL theming via `next-themes`, light/dark, reactbits creative components.
    - Aesthetic rule: avoid AI slop, prefer GSAP/Three for hero moments.

13. **Local Development**
    - `npm i`, `npm run dev`, build, lint.
    - Note `.env`, `src/integrations/supabase/client.ts`, and `src/integrations/supabase/types.ts` are auto-managed and must not be edited.
    - Lovable Cloud provides DB/auth automatically.

14. **Deployment**
    - Lovable publish → custom domain `flowersos.co`.
    - Edge functions deploy automatically on push.

15. **Glossary**
    - Sprint, Season, Tier, 68 set, 150 set, CB set, Bluebook, Closing Report, Intense Prep, Review Session, Switched Student.

### Files touched

- `README.md` — full rewrite (single file).

No code, dependency, or DB changes.

