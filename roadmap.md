# UI work
- [x] Educator applications and admin review: live submission, signed-in approval/payment gate verified; Emerald display rename preserves stored rank keys.
- [x] Educator admin/teacher/student previews render their selected roles; Mongolian mobile form checked with no overflow or runtime errors.
- [ ] Newly provisioned educator roster verification — requires an approved, paid educator account and configured center portal; existing center dashboard is reused.
- [x] Match sign-in pages to landing style and persisted language; add Start free, educator and sign-in actions; require signup for practice from Start free demo; public entry flow and mobile signup checked.
- [x] Landing background: superseded by cloud layers in the new landing page
- [x] Redesign the public landing page with the customer student sky design; preserve bilingual navigation and achievement photos; verified desktop/mobile language switching, photo dialogs, sign-in links, and no horizontal overflow.
- [x] Restyle customer student Practice in sky/purple and replicate main Review Mistakes graphs, breakdown and history sidebar using tenant-only data; isolated desktop/mobile checks and model tests pass.
- [ ] Verify customer Practice and Review Mistakes with a signed-in center student — available requesting account has no center student access; isolated layout checks do not verify real question loading.
- [x] Public investor demo: isolated 15-minute stored sessions, fictional progress, student/teacher/admin experiences, automatic deletion, and end-to-end verification (answers, reload, attendance, classes, announcements, visitor isolation, mobile, cleanup and cleanup-job shutdown).
- [x] Show a full-width SAT simulation locked island with distinct-question progress, remaining questions and a practice button in the customer student dashboard.
- [x] Check existing demo access and provide the center testing sign-in link with its access limitation.
- [x] Replace the mistaken center SAT test entry with the main dashboard's automatic data-based simulation island and shared algorithm.
- [x] Center-only sprint/all-time/rank-history tabs and a dashboard roadmap preview.
- [ ] Verify simulation island, ranking tabs and roadmap preview signed in as a center student — current requesting account has no center student access.
- [x] Fix admin light-mode contrast and adapt Resend's Atmospheric Glows reference without coloring data surfaces; verify signed-in dashboard in both appearances.
- [x] Refine admin using active Apple Design/Liquid Glass skills and the Vercel design reference; verify navigation and accessibility.
- [x] Confirm admin Concept Videos is visible again (user confirmed).
- [x] Update the admin dashboard and navigation to a monochrome Notion/Linear direction.
- [x] Add international institution customer tracking with health, payment dues and admin editing.
- [x] Verify signed-in admin customer creation, editing, payment tracking and navigation.
- [x] Center portals and subdomains, plus the full center admin workspace (sidebar, brand, batches, accounts, registration queue, sprints, announcements, team, settings).
- [ ] Center portals: mock tests, concept videos.
- [x] Activate the supplied Apple Design and Liquid Glass skills.
- [x] Prepare a platform-wide web adaptation preserving branding and learning flows.
- [x] Fix the missing Concept Videos link in the admin sidebar and verify navigation.
- [x] Center admin sidebar collapses to a floating icon rail with remembered state, tooltips and a working mobile drawer.
- [x] Step-by-step explanations accept photos by dragging them onto any step (one or many), with a clear drop highlight; verified in the live editor.
- [x] Center admin sidebar: customer logo no longer touches the card edge — header content vertically centered; verified live expanded and collapsed.
- [x] Teacher class cards and center batch/roster cards read as liquid glass (thinner frost, pointer specular, drifting sheen, masked rim) with an inner glass layer keeping every label ≥4.5:1 in both appearances.

- [ ] International main-platform /practice (intl cohort, non-center) still reads the Mongolian bank — switch to intDB next
- [ ] Concept videos inside center student portals

## Center portals — full replication (same pages, separate data; no SMS, no NGEE/review bookings)
- [x] Student: daily ring + goal setup + streak, emoji-free speed mode
- [ ] Student: remaining main features (badges/points, mock tests, vocabulary, stats, review queue parity)
- [ ] Teacher dashboard: homework, intense prep, proctored tests, class wrapped
- [ ] Center admin: batch analytics, student profiles parity

## Main portal scoreboard and badges (Duolingo report)
- [x] Fix stuck speed/discipline badges reading wrong point types; seasonal badge crash; Platinum naming
- [ ] Step 1+2 together: lock points/badges/streaks/rankings tables and move grading + awarding to server functions
- [ ] Step 3: server-side badge checks, "seen" flags on the server, fix Week Warrior/God Amongst Human/Ruby Legend meanings
- [ ] Step 4: 7-day sprints, safe middle zone, one group size, fix season-end drop bug, streak bonus out of league
- [ ] Step 5: badge ladders and personal records

- [x] Student sign-in moved to the server (secret token, one device, 90-day lock)
- [x] Student accounts and sign-in records locked; passwords moved to server-only store
- [x] Scoreboard locked: server grades answers, decides points, updates league totals
- [x] Server-side badge checks (streak badges verified; others server-only), badge points paid once into the league, Week Warrior = 70
- [x] Added 22 missing badges with server rules; celebration "seen" stored on the server; speed session totals checked against real answers
- [ ] Server rules for test-based badges (Blitz, Flawless Execution, August Ascent, October Olympian, Penguins, God Amongst Human)
- [ ] SAT simulation: Math-only answers, first try per question only (both portals); save daily prediction snapshots + real SAT to compare; switch method only if record shows misses
- [ ] Customer portal: server grading of practice answers, repeat answers pay 0, speed run checks, badge checks

## Solo sign-up (approved plan 2026-10-19)
- [x] Google/Apple/Microsoft/email sign-up on Start free pop-up and student sign-in page; free solo account record
- [x] Existing students: Connect Google prompt now explains self password reset; reset with connected Google
- [ ] Solo practice portal (real practice for solo students, premium locks on concept videos/planner)
- [ ] Admin: "Google connected" status + count of students not yet connected
- [ ] Premium price/payment method (needs user answer)
