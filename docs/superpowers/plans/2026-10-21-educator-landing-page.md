# Educator Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the short `/educators` page with a full, phone-first landing page that sells the center portal to SAT center and school owners and gets them to book a call.

**Architecture:** One page component (`src/pages/public/Educators.tsx`) built from the existing `landing-v2` styles, with the request form split into its own component. Small pure helpers (wording, rounding, lead source) are unit-tested. Live numbers come from one hook that runs three public, read-only queries. No database changes.

**Tech Stack:** React 18 + Vite + Tailwind + shadcn (`Button`, `Input`, `Label`, `Textarea`, `Accordion`), framer-motion, @tanstack/react-query, supabase-js, zod, vitest (node environment).

**Spec:** `docs/superpowers/specs/2026-10-21-educator-landing-page-design.md`

## Global Constraints

- **No database migration.** Read only through `landing_public_stats()`, published `concept_videos` and active `intl_questions`, all readable by anon today.
- Phone first. No horizontal scroll at 390px, and tap targets at least 44px.
- Every string goes through `text(mn, en)`. `/educators` with no `lang` query opens in English, even if the stored language is Mongolian. `?lang=mon` still opens Mongolian.
- Match `src/pages/Index.tsx`: the `landing-v2` wrapper, Chillax headings (`lv-h1`, `lv-h2`, `lv-lead`), `lv-sky` sections with the cloud SVGs, `lv-card`/`lv-tray` frames and the pastel `lv-*` chips. Use the same reveal-on-scroll pattern, with `{}` when `useReducedMotion()` is true.
- **Claims come only from the spec's facts table.**
  - Show counts, never percentages, for the 16 recorded scores.
  - Never write "every question has a Desmos solution", "nobody else", a price or a dollar figure.
  - Mention ACT only in the FAQ answer saying the platform is SAT only.
  - No testimonials or placeholder cards. No real student names, faces or scores.
- Don't change `submit_educator_demo_request`, `educatorApplicationSchema` or `src/pages/admin/DemoRequests.tsx`. The RPC arguments stay identical except `_message`.
- Work on branch `feat/educator-landing-page`. Lovable syncs `main`, so nothing reaches `main` before Task 7.
- Use the repo's shadcn components. Don't hand-roll inputs, buttons or the accordion.

## Review Focus

1. **A live count fails or is still loading.** The page shows the line without a number, never "0", "NaN" or "undefined". Pinned by the `explanationsLine`, `videoCountLabel` and `problemsSolvedLabel` tests in Task 2, plus the hook returning `null` on error in Task 4.
2. **The link has junk in `ref`** (HTML, spaces, more than 40 characters), or the visitor types a 2,000-character message. Junk `ref` is ignored, and the message sent stays at 2,000 characters or fewer, otherwise the RPC rejects it. Pinned by the `sourceFromSearch` and `appendSource` tests in Task 2.
3. **The visitor arrives from the Mongolian landing page (`?lang=mon`), or has Mongolian stored and no query.** The first gets Mongolian, the second gets English. Pinned by the `resolvePublicLanguage` tests in Task 1.
4. **A 390px phone shows the long numbers (`817,000+`), the stat grids or the form.** Nothing overflows sideways. Pinned by the scroll-width check in Tasks 4 and 5.
5. **"Book a call" scrolls to `#book`.** The section heading lands below the sticky header, not under it (`scroll-mt-20` on every anchored section). Checked by eye at 390px in Task 4.

---

### Task 1: English by default on `/educators`

**Files:**
- Modify: `src/lib/publicLanguage.ts` (`resolvePublicLanguage`)
- Modify: `src/hooks/usePublicLanguage.ts`
- Test: `src/lib/publicLanguage.test.ts`

**Interfaces:**
- Produces: `resolvePublicLanguage(query: string | null, stored: string | null, pageDefault?: PublicLanguage): PublicLanguage`. A valid query wins, then `pageDefault`, then the existing stored rule.
- Produces: `usePublicLanguage(pageDefault?: PublicLanguage)`. `pageDefault` is used only for the initial state. The `public-language-change` sync keeps calling `resolvePublicLanguage(null, stored)`.

- [ ] **Step 1: Add failing tests** to `src/lib/publicLanguage.test.ts`. The existing five tests stay as they are.

```ts
it('opens a page in its default language when there is no query', () => { expect(resolvePublicLanguage(null, 'mon', 'eng')).toBe('eng'); expect(resolvePublicLanguage(null, null, 'eng')).toBe('eng'); });
it('lets the query override the page default', () => { expect(resolvePublicLanguage('mon', 'eng', 'eng')).toBe('mon'); });
```

- [ ] **Step 2: Run them.** `npx vitest run src/lib/publicLanguage.test.ts`. Expected: the 2 new tests FAIL.
- [ ] **Step 3: Implement** the optional `pageDefault` in `resolvePublicLanguage` and `usePublicLanguage`.
- [ ] **Step 4: Run them again.** Same command. Expected: 7 passed.
- [ ] **Step 5: Commit.** `git commit -am "Let public pages set a default language"`

### Task 2: Wording and lead-source helpers

**Files:**
- Create: `src/lib/educatorLanding.ts`
- Test: `src/lib/educatorLanding.test.ts`

**Interfaces:**
- Produces:
  - `explanationsLine(count: number | null, lang: PublicLanguage): string`
  - `videoCountLabel(count: number | null, lang: PublicLanguage): string | null`. Returns `null` below 20.
  - `problemsSolvedLabel(answers: number | null): string | null`. Rounds down to the thousand and adds "+"; under 1,000 it shows the exact number.
  - `sourceFromSearch(search: string): string | null`. Reads `ref`, lowercases it, and accepts only `/^[a-z0-9_-]{1,40}$/`.
  - `appendSource(message: string, source: string | null, max = 2000): string`
- English copy is fixed by the tests below. Mongolian: write a natural translation; the Mongolian tests only check that the number is present.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { appendSource, explanationsLine, problemsSolvedLabel, sourceFromSearch, videoCountLabel } from './educatorLanding';
describe('educator landing wording', () => {
  it('counts explanations', () => { expect(explanationsLine(918, 'eng')).toBe('918 questions with step-by-step explanations'); expect(explanationsLine(1044, 'eng')).toBe('1,044 questions with step-by-step explanations'); expect(explanationsLine(918, 'mon')).toContain('918'); });
  it('falls back without a number', () => { for (const n of [null, 0]) expect(explanationsLine(n, 'eng')).toBe('Step-by-step explanations written by our teachers'); });
  it('shows video counts from 20 up', () => { expect(videoCountLabel(127, 'eng')).toBe('127 video lessons from the same teachers'); expect(videoCountLabel(20, 'eng')).toBe('20 video lessons from the same teachers'); expect(videoCountLabel(19, 'eng')).toBeNull(); expect(videoCountLabel(null, 'eng')).toBeNull(); });
  it('rounds problems solved down', () => { expect(problemsSolvedLabel(817495)).toBe('817,000+'); expect(problemsSolvedLabel(999)).toBe('999'); expect(problemsSolvedLabel(null)).toBeNull(); });
});
describe('lead source', () => {
  it('reads a clean ref', () => { expect(sourceFromSearch('?ref=websummit')).toBe('websummit'); expect(sourceFromSearch('?ref=WebSummit')).toBe('websummit'); expect(sourceFromSearch('?lang=eng&ref=utah-referral')).toBe('utah-referral'); });
  it('ignores junk', () => { expect(sourceFromSearch('?ref=<script>')).toBeNull(); expect(sourceFromSearch('?ref=' + 'a'.repeat(41))).toBeNull(); expect(sourceFromSearch('?lang=eng')).toBeNull(); expect(sourceFromSearch('?ref=')).toBeNull(); });
  it('appends the source', () => { expect(appendSource('Hello', 'websummit')).toBe('Hello\n\nSource: websummit'); expect(appendSource('', 'websummit')).toBe('Source: websummit'); expect(appendSource('Hello', null)).toBe('Hello'); });
  it('stays within 2000 characters', () => { const m = appendSource('x'.repeat(2000), 'websummit'); expect(m.length).toBe(2000); expect(m.endsWith('Source: websummit')).toBe(true); });
});
```

- [ ] **Step 2: Run them.** `npx vitest run src/lib/educatorLanding.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** the five functions in `src/lib/educatorLanding.ts`. Format numbers with `toLocaleString('en-US')`.
- [ ] **Step 4: Run them again.** Same command. Expected: all pass.
- [ ] **Step 5: Commit.** `git add src/lib/educatorLanding.* && git commit -m "Add educator landing helpers"`

### Task 3: Request form as its own component

**Files:**
- Create: `src/components/educators/EducatorRequestForm.tsx`
- Modify: `src/pages/public/Educators.tsx` (use it in place of the inline form and toggle)

**Interfaces:**
- Consumes: `appendSource` and `sourceFromSearch` (Task 2).
- Produces: `EducatorRequestForm({ text, source }: { text: (mn: string, en: string) => string; source: string | null })`. It is always open, with no toggle.

- [ ] **Step 1: Move the form.** Move the state, `fields`, `submit`, honeypot, success state and error handling from `Educators.tsx` into the component, unchanged, with three exceptions:
  - `_message` becomes `appendSource(f.message, source)`.
  - The submit label becomes "Book a call" / "Уулзалт товлох".
  - The headings and notes say "call" instead of "demo". Success body: "We'll contact you to set up the call. Workspace access follows approval and confirmed payment."
- [ ] **Step 2: Wire it in.** `Educators.tsx` renders `<EducatorRequestForm text={text} source={sourceFromSearch(window.location.search)} />` and drops the "Book a demo" toggle button.
- [ ] **Step 3: Verify.**
  - Run `npx tsc --noEmit -p tsconfig.app.json && npx eslint src/components/educators src/pages/public/Educators.tsx`. Expected: no errors.
  - Run `git diff -U0 | grep "_name\|_institution\|_email\|_phone\|_country\|_students\|_website"` and confirm those RPC arguments are unchanged.
- [ ] **Step 4: Commit.** `git add src/components/educators && git commit -am "Move the educator request form into its own component"`

### Task 4: Page frame, hero, results and live numbers

**Files:**
- Create: `src/components/landing/Clouds.tsx` (moved from `src/pages/Index.tsx:21-27`; Index imports it)
- Create: `src/hooks/useEducatorStats.ts`
- Rewrite: `src/pages/public/Educators.tsx` (drop `AuthSplitLayout`)

**Interfaces:**
- Consumes: `usePublicLanguage('eng')` (Task 1), the Task 2 helpers, and `EducatorRequestForm` (Task 3).
- Produces:
  - `useEducatorStats(): { explanations: number | null; videos: number | null; answers: number | null }`. Each value is `null` while loading or on error. Use react-query with `staleTime: 10 * 60_000`.
  - `explanations`: count `intl_questions` with `is_active = true` and `hide_from_practice = false` where `rationale` is not null and not `''`. Use `{ count: 'exact', head: true }`.
  - `videos`: count `concept_videos` with `is_published = true`.
  - `answers`: `landing_public_stats().answers`, called the same way `Index.tsx:37` calls it.

Copy (English; Mongolian through `text()`):

| Where | Copy |
|---|---|
| Header | Brand → `/`. At `md` and up, nav anchors "Results" `#results`, "Desmos" `#desmos`, "Your center" `#center`, "FAQ" `#faq`. Then the ENG/МОН toggle, "Sign in" → `#signin`, and a "Book a call" button → `#book`. Sticky, like Index |
| Hero eyebrow | For SAT centers and schools |
| Hero h1 | Run your SAT center on the platform behind two perfect 800s. |
| Hero lead | Built by the teachers at Tsetsegs, an SAT center where 80+ students sit every SAT. {explanationsLine}, video lessons from the same teachers, and a student side built to keep them practicing. |
| Hero buttons | "Book a call" → `#book`, "See the platform" → `#platform` |
| Results `#results` label | August 2026 SAT, math section |
| Results cards | **2** perfect 800s · **8** scored 750+ · **14** scored 700+ · **{problemsSolvedLabel}** problems solved on the platform since December 2025 (hide this card when `null`) |
| Results footnote | Scores our teachers recorded after the August 2026 SAT. |
| Book `#book` (`lv-sky` + `Clouds`) | h2 "Book a call", lead "Tell us about your center and we'll get in touch to set up a time.", then `EducatorRequestForm` |
| Footer `#signin` | Brand, "Tsetsegs SAT Prep", "Already a customer?", "Admin sign in" → `/login?role=admin&lang=${lang}`, "Teacher sign in" → `/login?role=teacher&lang=${lang}`, "Existing centers sign in at their own center's address." |

- [ ] **Step 1: Extract `Clouds`.** Move it to `src/components/landing/Clouds.tsx` and import it in `Index.tsx`. `npx tsc --noEmit -p tsconfig.app.json` passes.
- [ ] **Step 2: Implement `useEducatorStats`.**
- [ ] **Step 3: Rebuild `Educators.tsx`.** Build the header, hero (`lv-sky` + `Clouds`), results, book section and footer with the copy above, and `scroll-mt-20` on every anchored section. The hero's right column stays empty until Task 6, so on phones the text fills the width.
- [ ] **Step 4: Visual check.**
  - Start `npm run dev` (port 8080). Write a scratchpad script `educators-check.mjs` that drives Chrome over CDP using Node's global `WebSocket` and `--remote-debugging-port`. Don't use the browser skill; it's broken here. For each width, 390 and 1280:
    - Set `Emulation.setDeviceMetricsOverride` (`mobile: width < 500`, `deviceScaleFactor: 2`).
    - Set `Emulation.setEmulatedMedia` with `prefers-reduced-motion: reduce`.
    - Open `http://localhost:8080/educators?ref=websummit` and wait for network idle plus 2s.
    - Print `document.documentElement.scrollWidth`.
    - Save a full-page screenshot.
  - Expected: scrollWidth ≤ width at both sizes. Every section is visible in the screenshots. The English copy shows even with `localStorage['flowersos-public-language'] = 'mon'` set first.
- [ ] **Step 5: Live numbers match the database.**
  - Run `set -a; . ./.env; set +a; curl -s -o /dev/null -D - "$VITE_SUPABASE_URL/rest/v1/intl_questions?select=id&is_active=eq.true&hide_from_practice=eq.false&rationale=not.is.null&rationale=neq." -H "apikey: $VITE_SUPABASE_PUBLISHABLE_KEY" -H "Authorization: Bearer $VITE_SUPABASE_PUBLISHABLE_KEY" -H "Prefer: count=exact" -H "Range: 0-0" | grep -i content-range`
  - Expected: the number after `/` equals the number in the hero lead. It was 918 on 21 Oct.
- [ ] **Step 6: Tap `#book` at 390px** in the CDP script by scrolling to the anchor and taking a viewport screenshot. Expected: the "Book a call" heading sits below the sticky header.
- [ ] **Step 7: Commit.** `git add -A src && git commit -m "Educator page: frame, hero, results, live numbers"`

### Task 5: Remaining sections

**Files:**
- Modify: `src/pages/public/Educators.tsx`

**Interfaces:**
- Consumes: `useEducatorStats`, `explanationsLine` and `videoCountLabel`, plus `TIER_ASSETS` from `@/components/student/leaderboard/tierAssets`.

Copy, in page order between results and book:

| Section | Copy |
|---|---|
| `#desmos` | h2 "SAT math in seconds, with Desmos". Body "Desmos is built into the digital SAT. Our teachers use it to solve SAT math in seconds, and they teach every student to do the same. Their explanations show the Desmos shortcut wherever there is one." Chips: `explanationsLine`; `videoCountLabel` (omit when `null`) |
| `#practice` (`lv-sky`) | h2 "Students who practice more score higher". Body "Every student we recorded at 700+ on the August SAT had solved at least 500 problems on the platform, and most had solved more than 1,500. Streaks, weekly ranks, daily goals and speed rounds keep them coming back." Stats: **271** students kept a 7-day streak · **25** kept one going for 30+ days. The row of rank art from bronze to ruby, as in `Index.tsx:128-130` |
| `#center` | h2 "Run your whole center in one place". Lead "Your own workspace, with your logo and colors." Grid, see the list below |
| `#story` | h2 "Built inside a real SAT center". Body "Tsetsegs is an SAT center where 80+ students sit every SAT. We built this platform for our own classes and have run the center on it since December 2025. The teachers who wrote the explanations and recorded the lessons teach SAT math with Desmos every day." |
| `#how` | h2 "How it works". 1 "Book a call": "Tell us about your center. We'll walk you through the platform and talk about price." 2 "We set up your center": "Your workspace, logo and colors, classes and students." 3 "Your students start practicing": "They sign in at your center's own address." |
| `#platform` | h2 "Look around first". Lead "Sample workspaces with made-up students." The three existing demo links (admin, teacher, student) with their current labels and `href`s |
| `#faq` (shadcn `Accordion`) | "How much does it cost?" → "It depends on the size of your center. We go through pricing on the call." "Does it cover the ACT?" → "No. The platform is built for the digital SAT." "What language is it in?" → "English. Questions, explanations and video lessons are all in English." |

`#center` grid. Before listing an item, confirm it exists in the file shown. Drop any item you can't confirm.

| Item | Evidence |
|---|---|
| Classes, teachers and attendance | `src/portal/CenterTeacherPortal.tsx` (`tenant_attendance`) |
| Question bank with step-by-step explanations | `src/portal/CenterStudentPortal.tsx` (`ExplanationView`) |
| Full SAT simulation | `src/portal/CenterSAT.tsx` |
| Score prediction | `tenant_sat_predictions`, `src/portal/admin/StudentPages.tsx` |
| Speed rounds | `src/portal/CenterSpeedLobby.tsx` |
| Rankings, streaks and badges | `src/portal/CenterRankings.tsx`, `src/portal/CenterStreak.tsx` |
| Daily goals | `src/portal/CenterDailyGoals.tsx` |
| Live class quizzes | `src/portal/LiveSession.tsx` |
| Video lesson roadmap | `src/portal/VideoRoadmap.tsx` |
| Mistake review | `src/portal/CenterReviewPage.tsx` |
| Center analytics | `src/portal/CenterAnalytics.tsx` |

Not on the list: homework (absent) and parent links (the "parent" matches in `src/portal` are the CSS word "transparent").

- [ ] **Step 1: Build the seven sections** with the copy above and `scroll-mt-20` on each.
- [ ] **Step 2: Claims check.** Run `grep -nE "every (math )?question|Desmos solution for|nobody|only platform|\\\$[0-9]|[0-9]+ ?%" src/pages/public/Educators.tsx src/lib/educatorLanding.ts`. Expected: no output.
- [ ] **Step 3: Visual check.** Run `educators-check.mjs` from Task 4. Expected: scrollWidth ≤ width at 390 and 1280. All sections are visible, the FAQ opens on tap, and the rank art doesn't wrap off-screen.
- [ ] **Step 4: Commit.** `git commit -am "Educator page: Desmos, practice, center, story, FAQ"`

### Task 6: Product screenshots

Saagii is needed for this task. It can start any time and is wired in last.

**Files:**
- Create:
  - `src/assets/educators/question.png`: center student portal, a math question with its explanation open, showing a Desmos step
  - `src/assets/educators/video-roadmap.png`: center student portal, the video roadmap
  - `src/assets/educators/class-hub.png`: center teacher portal, the class hub with made-up students
- Modify: `src/pages/public/Educators.tsx` (hero right column, `#desmos`, `#center`)

- [ ] **Step 1 (Saagii): Prepare the test center.** Add about 10 made-up students to the existing test center. Then either take the three screenshots yourself at 1280×800 in desktop Chrome, or give the executor one test-center teacher login and one made-up student login so they can capture them with the Task 4 CDP script (`deviceScaleFactor: 2`).
- [ ] **Step 2: Shrink and check the images.** Run `sips -Z 1600 src/assets/educators/*.png`. Then open each image and confirm that no real student name, phone number or real score appears anywhere in it.
- [ ] **Step 3: Wire them in.**
  - `question.png` goes in the hero's right column, inside `lv-tray` > `lv-screen`, eager-loaded. On phones it sits below the text.
  - `video-roadmap.png` goes beside the `#desmos` copy, and `class-hub.png` beside the `#center` grid. Both use `loading="lazy"`.
  - Every image gets `width`/`height` and alt text that describes it.
- [ ] **Step 4: Visual check.** Run `educators-check.mjs`. Expected: scrollWidth ≤ width at 390 and 1280, and every image shown at its full width.
- [ ] **Step 5: Commit.** `git add src/assets/educators src/pages/public/Educators.tsx && git commit -m "Educator page: product screenshots"`

### Task 7: Ship

- [ ] **Step 1: Run the full checks.** `npx vitest run && npm run build && npx eslint src/pages/public/Educators.tsx src/components/educators src/lib/educatorLanding.ts src/hooks/useEducatorStats.ts src/components/landing/Clouds.tsx src/pages/Index.tsx && npx tsc --noEmit -p tsconfig.app.json`. Expected: all pass. tsc and eslint were clean on these files before the work started.
- [ ] **Step 2: Land on main.**
  - Run `git fetch origin && git rebase origin/main && npx vitest run && npm run build`. Lovable may have pushed to `main` in the meantime.
  - Run `git push origin HEAD:main`. This is a fast-forward; never force-push `main`.
  - Run `git push --force-with-lease origin feat/educator-landing-page` so the branch matches.
- [ ] **Step 3 (Saagii): Check and publish.**
  - In Lovable, open the preview at `/educators?ref=websummit` at phone width.
  - Read the Mongolian version (МОН).
  - Publish.
- [ ] **Step 4 (Saagii, in Lovable chat): Launch data.** Review these first; each is a single statement:
  - Unhide the INT DB questions for centers: `UPDATE public.intl_questions SET hide_from_practice = false WHERE ext_variant AND is_active AND hide_from_practice;`
  - Publish the video lessons. First confirm all 126 unpublished videos are ready, either in the admin videos page or with this statement: `UPDATE public.concept_videos SET is_published = true WHERE NOT is_published;`
- [ ] **Step 5: Confirm the numbers moved.** Re-run the Task 4 Step 5 curl. Expected: the count is higher than 918, and `/educators` shows the same number after a refresh (it caches for 10 minutes).
- [ ] **Step 6: Hand over what's still open.**
  - Student quote permission: add the quote later if the student agrees.
  - An owner for the Demo Requests inbox: nothing notifies anyone of new requests.
  - Whether to hide or solve the 119 older math questions.
