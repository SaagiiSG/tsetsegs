

## Live Practice Mode (Kahoot-style) for Teacher Dashboard

### Concept
A new **"Practice"** mode in the teacher bottom nav that lets teachers run live, competitive quiz sessions in class. Teachers pick questions from any question set, generate a QR code, students scan it, enter their name + phone, and race to answer -- earning points in real-time with a live leaderboard projected on screen.

### Flow

```text
Teacher Flow:
[Bottom Nav: Practice] → Create Session screen
  → Pick question set (68 / CollegeBoard / 150 Hard / English / All)
  → Pick # of questions (5, 10, 15, 20) or hand-pick specific ones
  → Set time per question (15s, 30s, 45s, 60s)
  → "Start Session" → QR code + join code displayed
  → Lobby (see who's joined, live count)
  → Teacher taps "Next Question" to advance
  → Live leaderboard after each question
  → Final podium / results at the end

Student Flow:
[Scans QR / visits link] → Enter name + phone number
  → Waiting lobby ("Waiting for teacher...")
  → Question appears with countdown timer
  → Submit answer → instant feedback (correct/wrong)
  → See rank after each round
  → Final results screen with total points
```

### Database Changes (3 new tables)

**`live_sessions`** -- one row per quiz session
- `id` (uuid PK), `teacher_name` (text), `join_code` (text unique, 6-char), `question_set` (text), `time_per_question` (int, seconds), `status` (enum: waiting/active/finished), `current_question_index` (int default 0), `created_at`, `finished_at`

**`live_session_questions`** -- ordered questions for a session
- `id` (uuid PK), `session_id` (FK → live_sessions), `question_id` (FK → questions), `order_index` (int)

**`live_session_participants`** -- who joined + their answers
- `id` (uuid PK), `session_id` (FK → live_sessions), `player_name` (text), `phone_number` (text), `total_points` (int default 0), `joined_at`

**`live_session_answers`** -- individual answers per question
- `id` (uuid PK), `session_id` (FK), `participant_id` (FK → live_session_participants), `question_id` (FK → questions), `answer` (text), `is_correct` (bool), `time_taken_ms` (int), `points_earned` (int), `submitted_at`

Enable **Realtime** on `live_session_participants` and `live_session_answers` for live updates.

RLS: All tables public-read for active sessions (students join without auth), insert allowed for participants/answers. Only teachers can create/update sessions.

### File Changes

1. **`src/pages/TeacherDashboard.tsx`**
   - Add `"practice"` to `DashboardMode` type and `MODE_ORDER`
   - Add Practice button to bottom nav bar (Gamepad2 icon)
   - Render `<LivePracticeContent />` when mode is "practice"

2. **New: `src/components/teacher/live-practice/LivePracticeContent.tsx`**
   - Main container: setup form → lobby → question control → results
   - Question set selector (68 / CB / 150 / English / All)
   - Count selector + time-per-question selector
   - Random question picker from selected set
   - Generates 6-char join code, creates `live_sessions` row
   - Shows QR code (pointing to `/live/{joinCode}`) + join code text

3. **New: `src/components/teacher/live-practice/LiveLobby.tsx`**
   - Real-time participant list via Supabase subscription
   - "Start" button when >= 1 player joined
   - Live player count with animation

4. **New: `src/components/teacher/live-practice/LiveQuestionControl.tsx`**
   - Teacher view: shows current question, answer distribution bar chart, timer
   - "Next Question" / "Show Results" buttons
   - Updates `current_question_index` and `status` in real-time

5. **New: `src/components/teacher/live-practice/LiveLeaderboard.tsx`**
   - After each question: animated leaderboard with point changes
   - Final screen: podium (top 3) with confetti, full rankings

6. **New: `src/pages/LiveSession.tsx`** (public route, no auth required)
   - Student-facing join page at `/live/:joinCode`
   - Enter name + phone → join as participant
   - Listens to session state changes via Realtime
   - Shows question + choices + countdown timer
   - Submit answer → instant correct/wrong feedback
   - Between questions: shows player's current rank

7. **`src/App.tsx`**
   - Add public route: `/live/:joinCode` → `<LiveSession />`

### Points Logic
- Correct answer: base 1000 points, scaled by speed (faster = more points)
- Formula: `points = correct ? Math.round(1000 * (timeRemaining / totalTime)) : 0`
- Minimum 100 points for any correct answer

### Key UX Details
- Teacher projects their screen showing the QR/lobby/leaderboard
- Students play on their phones -- no login needed, just name + phone
- Questions render with `<MathText>` for LaTeX support
- Mobile-first student UI with large tap targets
- Animated transitions between states (framer-motion)
- Sound-optional celebration effects on correct answers

