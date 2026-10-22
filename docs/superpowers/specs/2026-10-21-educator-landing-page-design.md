# Educator landing page: design

Date: 21 Oct 2026. Owner: Saagii. Route: `/educators` (replaces `src/pages/public/Educators.tsx`).

## Intent

Misheel (Tsetsegs CEO) goes to Web Summit in Lisbon, 9–12 Nov 2026, and will hand out a link. A former mayor in Utah has also offered to refer schools for a cut. Both send people to the "I am an educator" button on flowersos.co, which today opens a short form with three demo buttons. Nothing on it explains why a center should pay.

The new page sells the customer center portal (`src/portal/*`, tenant tables) to people who run SAT centers or high schools. It has one job: **get them to book a call.** Price is only discussed on the call.

The pitch: *run your whole SAT center on the platform built by the teachers behind these results.* The Tsetsegs teachers are Desmos experts, and their know-how is in the platform: step-by-step explanations written by the teachers (live count, with the Desmos shortcut on math wherever there is one), video lessons, and a gamified student side that keeps students practicing.

## Reader

Someone who runs an SAT center or a high school. They met Misheel for two minutes, or got the link from a referrer, and open it later, **most likely on a phone**. They are sceptical. They already have free tools (Bluebook, Khan Academy, Google Classroom) and will ask "why pay?" and "isn't this just a good teacher?"

## Goals

- A visitor understands within one screen what this is, who built it, and the strongest result.
- Every claim is true on the day it is read, and traceable to a source (table below).
- "Book a call" is reachable from anywhere on the page and works on a phone.
- Matches the look of the current landing page (`src/pages/Index.tsx`): `landing-v2` tokens, Chillax headings, `lv-sky` gradient with the layered cloud SVGs, `lv-card`/`lv-tray` frames, pastel `lv-*` chips, gentle reveal on scroll that respects reduced motion.
- Live and published on main before Misheel flies (about 7 Nov).

## Non-goals

- Rebuilding the demo pages (`src/demo/InvestorDemo.tsx`). Saagii finds them gimmicky; that's a separate project after this one.
- A pricing page or any price on this page.
- ACT. The platform is SAT-only.
- Email or SMS alerts for new requests.
- Changing the student landing page (`Index.tsx`) beyond what is needed to share components.

## Anti-goals (a failure even if it works)

- Any number or claim that is false on the day someone reads it.
- Fake or placeholder testimonials. The student page shows dashed "awaiting consent" cards; this page must not.
- Percentages based on the 16 recorded SAT scores ("88% scored 700+"). Teachers entered 16 of the 80+ who sat that month. Show counts only.
- "Nobody else does this." 1600.io has videos and some Desmos graphs for official tests, so the claim is not safe.
- Real student names, faces or scores without consent. Product screenshots use sample data only.
- Breaking the existing request flow: `submit_educator_demo_request` and the admin Demo Requests page (`src/pages/admin/DemoRequests.tsx`).
- Feeling like a gimmick: no fake dashboards dressed up as the product.

## Constraints

- Code: SaagiiSG/tsetsegs, React + Vite + Tailwind + shadcn, framer-motion. Lovable syncs `main` and Saagii publishes by hand.
- **No database migration.** Everything the page needs is readable today: `landing_public_stats()` (anon), published `concept_videos` (anon), active `intl_questions` (anon). If a migration turns out to be needed, the two-step rollout rule applies (functions first, push code, publish, then locks).
- Phone first. No horizontal scroll at 390px; tap targets at least 44px.
- English is the default on this page (see Behaviour). The ENG/МОН toggle stays; every string goes through `text(mn, en)` like the rest of the public site.

## Decided by Saagii

- Buyer: high school owners and SAT center operators.
- One action: book a call. Price only on the call. (He plans to charge from $5,000 a year.)
- Same cloudy look as the current landing page.
- English first.
- Keep the existing request form.
- Keep the demo buttons, even though the demos themselves are weak.
- The claim is a **live count**: "N questions with step-by-step explanations", taken from the database, never typed in. About 80% of math solutions use Desmos, so the page says "with the Desmos shortcut wherever there is one", never "every question has a Desmos solution". His team (9 people) is writing math explanations now.
- Centers should see every question in the INT DB (the 893 math variants, 1,106 by 24 Oct, plus the 900 English questions).
- A test center exists, with no students in it yet.

## Facts the page may use

Numbers checked 21 Oct 2026 unless marked live.

| Claim | Value | Source | Keep it true by |
|---|---|---|---|
| August 2026 SAT math results | two 800s, 8 at 750+, 14 at 700+ | `student_accounts.sat_math_score`, all dated 22 Aug 2026 | Hard-coded with the date ("August 2026 SAT") |
| Top scorers practise the most | All 16 recorded scorers solved 500+ problems; 14 solved 1,500+. The typical student solves 270. | `student_attempts` grouped by student | Hard-coded |
| Problems solved | 817,495 | `landing_public_stats().answers` | **Live**, rounded down (e.g. "817,000+") |
| Running since | first answer 8 Dec 2025 | `student_attempts` | "since December 2025" |
| Center size | 80+ students sit every SAT month | Saagii | Hard-coded |
| Questions with step-by-step explanations | 1,044 active (900 English, 144 math; 98 of the math mention Desmos); 918 visible to centers | `intl_questions.rationale` | **Live** (see Behaviour) |
| Video lessons | 129 in `concept_videos` (127 YouTube), **only 3 published** | `concept_videos` | **Live** count of published videos |
| Streaks | 271 students held a 7+ day streak; 25 held 30+ | `student_streaks` | Hard-coded |
| Math practice-test gains | from `landing_public_stats()` (`avg_gain`, `gained100_pct`) | `practice_tests` 0–800 scores | Live, supporting proof only |
| Student quote | "Teacher, this is addicting" (texts to Saagii) | Saagii | Only with the student's permission, first name only. If no permission by launch, ship without it |

## Page structure

Top to bottom. The copy below is starting copy; the builder may tighten it but must keep the claims.

1. **Header.** Brand, ENG/МОН toggle, "Center sign in" (goes to the existing admin and teacher sign-in links). Same sticky header as `Index.tsx`.
2. **Hero** (`lv-sky` + clouds). Eyebrow: "For SAT centers and schools". Headline along the lines of "Run your SAT center on the platform behind two perfect 800s." Lead: built by the Tsetsegs teachers, 80+ students every SAT month, the live count of questions with step-by-step explanations. Primary button "Book a call"; secondary "See the platform". Visual: a real screenshot of a math question with its Desmos solution open, in an `lv-tray` frame. On phones the visual sits below the text.
3. **Results strip.** August 2026 SAT math counts, plus live problems solved.
4. **The Desmos edge.** Desmos is built into the digital SAT; our teachers solve SAT math in seconds with it, and their solutions show the Desmos shortcut wherever there is one. Show a real solution screenshot. Mention the video lessons by the same teachers, with the live count.
5. **Students who practise more score higher.** Streaks, ranks (`TIER_ASSETS`), daily goals, speed mode, rankings. The streak numbers. "Every student we recorded at 700+ had solved 500+ problems; most solved 1,500+." The quote, if permitted.
6. **Run your whole center.** A grid of what the center portal includes, with your own logo and colours (`portal_settings.logo_url`, `brand_color`). List only features that exist in `src/portal/*` today. From a first look that includes classes and teachers, attendance, a practice bank, full SAT simulation and score prediction, speed mode, rankings, streaks, daily goals, live class sessions, video roadmap, review, analytics and parent links. **Homework does not appear in the portal; leave it out.** The builder confirms each item against the code.
7. **Built by Tsetsegs.** Short story: a working SAT center, running on this platform since December 2025, 80+ students per SAT month, teachers who teach Desmos for a living.
8. **How it works.** Three steps that match the real flow in `DemoRequests.tsx`: book a call → we set up your center (logo, classes, students) → your students start practising.
9. **See the platform.** The three existing demo links (admin, teacher, student), presented as secondary.
10. **FAQ.** Only questions with a known true answer: price ("depends on your center; we cover it on the call"), SAT only, English. Setup time and package contents stay off until Saagii supplies the facts.
11. **Book a call** (`lv-sky` + clouds, `id="book"`). The existing form, same fields, same RPC, honeypot kept. Button text "Book a call". Every "Book a call" button on the page scrolls here.
12. **Footer.**

## Behaviour

- **Language.** `/educators` with no `lang` query opens in English, even if the visitor's stored language is Mongolian. `?lang=mon` (sent by the Mongolian landing page button) still opens Mongolian. The toggle works as it does elsewhere.
- **Explanations count, live.** Count active questions centers can see (`intl_questions`, `is_active = true`, `hide_from_practice = false`, the same filter the center portal uses) that have a non-empty `rationale`, English and math together. Show "1,044 questions with step-by-step explanations" style wording, rounded down to the nearest 10 is fine. Math sections add "with the Desmos shortcut wherever there is one". While loading or on error, show the line without a number: "Step-by-step explanations written by our teachers." On 21 Oct the count was 918 (1,044 if hidden questions were included).
- **Video count, live.** Count published `concept_videos`. Hide the number if it is under 20. The videos are the Tsetsegs teachers' own unlisted YouTube uploads.
- **Where a request came from.** If the link carries `?ref=<name>` (e.g. `?ref=websummit`), keep it through the page and append `Source: <name>` to the request's message text. No migration.
- **Problems solved, live** from `landing_public_stats()`, as `Index.tsx` already does.
- **Form.** Unchanged validation (`educatorApplicationSchema`) and RPC. On success, the existing "Request received" state.

## Calls I made (Saagii to check)

- The form moves from a toggled panel into its own section at the bottom, with every CTA scrolling to it.
- The explanations count counts what centers can see (918 on 21 Oct), not every active question (1,044). Unhiding the INT DB math raises it.
- English default on `/educators` regardless of stored language.
- Screenshots come from the existing test center after Saagii adds about 10 made-up students. Only screens that look right without practice history are captured: a question with its solution open, the video roadmap, center settings with a logo, a class list. Gamification is shown with the rank art and the real numbers, not an empty leaderboard.
- Homework left out of the feature list because the portal doesn't have it.
- Lead source recorded by appending `?ref=` to the message, not a new column, to avoid a migration before Web Summit.
- FAQ limited to answers we know are true.

## Left to the builder

- Final copy wording within the claims above, and the Mongolian translations (Saagii reviews).
- Section spacing, motion details, how the grid collapses on phones.
- Whether to extract `Clouds` and the header from `Index.tsx` into shared components.
- How to capture and store the screenshots (static assets under `src/assets/educators/`).

## Before launch (not code)

- **Publish the video lessons.** 126 of 129 are unpublished, so students and demo viewers see 3.
- **Unhide the INT DB math questions for centers** (Saagii's decision). On 21 Oct centers could see 233 math questions; 779 of the 893 variants were hidden, including 126 of the 144 already solved. One data update: `hide_from_practice = false` for active `ext_variant` rows. Hidden INT DB questions aren't used anywhere a center sees (practice, live sessions and the center SAT simulation all skip them), so unhiding doesn't expose questions reserved for mock tests.
- **119 older math questions outside the INT DB are also visible to centers** (112 non-variant originals plus 7 others), with no explanations. They don't affect the live count; Saagii decides later whether to hide or solve them.
- Ask the student behind the quote for permission.
- Someone owns the request inbox. There is no notification; requests only appear on the admin Demo Requests page.
