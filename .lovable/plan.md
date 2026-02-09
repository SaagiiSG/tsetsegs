
# Strategic Roadmap: SAT Prep Platform 2.0

## Executive Summary

This platform is already a sophisticated SAT preparation system with three distinct user personas (Student, Teacher, Admin), a mature gamification layer, and robust analytics. The following plan outlines high-impact improvements organized by user persona, prioritized by implementation complexity and value delivered.

---

## Current State Analysis

### Strengths Identified
- **Students**: Comprehensive practice system (68-question bank + CollegeBoard imports), Bluebook mock tests, vocabulary flashcards, speed drills, spaced repetition review, full gamification (tiers, sprints, badges, leaderboards), rich analytics dashboard
- **Teachers**: Class management, attendance tracking, homework monitoring, student alerts, analytics per batch, intense prep group tracking
- **Admins**: "Mission Control" dashboard, question bank management with AI variations, sprint monitoring, platform health metrics, class comparison analytics, student deep-dive tools

### Gaps & Opportunities
1. **Mobile UX** - The system is usable on mobile but not optimized for thumb-first navigation
2. **Offline Mode** - No offline support for practice sessions
3. **AI-Personalized Learning** - Static question ordering; no adaptive difficulty
4. **Parent/Guardian Portal** - No visibility for parents into student progress
5. **Real-time Collaboration** - No teacher-student messaging or live sessions
6. **Goal Setting & Milestones** - Students set SAT date but no score targets with actionable paths
7. **Content Gaps** - English question bank appears smaller than Math; no reading passage practice simulation
8. **Notification System** - No push notifications or email reminders

---

## Phase 1: Quick Wins (1-2 weeks each)

### 1.1 Student: Score Target & Milestone System
**Problem**: Students see their SAT date but lack a concrete path from current score to target score.

**Solution**: 
- Add "Target Score" field to student profile (e.g., 1400, 1500, 1550)
- Create a "Score Pathway" card on the dashboard showing:
  - Current estimated score (from Bluebook tests)
  - Target score
  - Points needed (gap)
  - Weekly milestones (e.g., "Week 1: +15 pts from Algebra mastery")
- Show personalized "Daily Focus" based on weakest topic that has highest score potential

**Files to modify**:
- `src/pages/student/StudentDashboardHome.tsx` - Add score pathway card
- `src/hooks/useStudentProfile.ts` - Fetch/save target score
- Database: Add `target_score` column to `student_accounts`

---

### 1.2 Student: "Session Recap" Micro-Summary
**Problem**: After completing practice or speed sessions, students get limited feedback on what to do next.

**Solution**: 
- After any practice session ends, show a modal with:
  - Performance summary (correct/incorrect, time stats)
  - "Top 2 areas to review" with one-tap navigation
  - "Schedule review" button that adds weak questions to spaced repetition queue
  - Confetti/celebration for personal bests

**Files to modify**:
- Create `src/components/student/SessionRecapModal.tsx`
- Integrate into `StudentQuestion.tsx`, `StudentSpeedSession.tsx`, `StudentBluebookTest.tsx`

---

### 1.3 Teacher: "Nudge" Quick Actions
**Problem**: Teachers see at-risk students but have no quick action from the dashboard.

**Solution**: 
- Add "Send Nudge" button on StudentAlertsTab and StudentCard
- Nudge options: 
  - Copy pre-written message to clipboard (for SMS/WeChat)
  - Log that nudge was sent (visible in student timeline)
- Show "Nudge History" in teacher analytics

**Files to modify**:
- `src/components/teacher/StudentAlertsTab.tsx`
- `src/components/teacher/StudentCard.tsx`
- Database: Create `student_nudges` table

---

### 1.4 Admin: Import Session Enhancement
**Problem**: CB question imports can fail silently; review sessions exist but aren't prominently surfaced.

**Solution**: 
- Add import progress toast with real-time success/error counts
- After import completes, auto-navigate to Review Sessions with the latest session expanded
- Add "Re-parse" button for individual failed pages using a different AI prompt
- Add bulk "Resolve" for pages that are truly blank

**Files to modify**:
- `src/components/admin/questions/CBQuestionImport.tsx`
- `src/components/admin/questions/CBImportReviewSessions.tsx`

---

## Phase 2: Core Experience Upgrades (2-4 weeks each)

### 2.1 Student: Adaptive Practice Mode
**Problem**: Question order is static; students waste time on mastered topics.

**Solution**: 
- Create "Smart Practice" mode that:
  - Weights question selection toward weak topics (using accuracy data)
  - Adjusts difficulty based on recent performance
  - Balances between reinforcement and challenge
- Show "Why this question?" tooltip explaining the AI selection

**Implementation**:
- Create adaptive algorithm in `src/lib/adaptiveSelection.ts`
- Add "Smart Mode" toggle to `StudentPractice.tsx`
- Track question difficulty in `questions` table

---

### 2.2 Student: Reading Passage Simulator
**Problem**: English practice lacks realistic passage-based question flow.

**Solution**: 
- Create a "Reading Module" that:
  - Shows a passage on the left, questions on the right (desktop) or passage-then-questions (mobile)
  - Times the passage reading separately from answering
  - Groups 3-5 questions per passage (like real SAT)
- Reuse existing English questions but group them by passage

**Files to create**:
- `src/pages/student/StudentReadingModule.tsx`
- `src/components/student/PassageReader.tsx`
- Database: Add `passage_group_id` to questions

---

### 2.3 Teacher: Class Progress Dashboard
**Problem**: Teachers have analytics per batch but no "at-a-glance" view of all their classes.

**Solution**: 
- New "Overview" tab on TeacherDashboard showing:
  - All classes in a grid with key metrics (attendance %, avg score, at-risk count)
  - Comparison sparklines (this week vs last week)
  - "Needs Attention" badge on struggling classes
- Click to drill into existing TeacherClassAnalytics

**Files to create**:
- `src/components/teacher/TeacherOverviewGrid.tsx`
- Modify `src/pages/TeacherDashboard.tsx`

---

### 2.4 Admin: Question Quality Dashboard
**Problem**: Some questions may be too easy, too hard, or poorly worded (high skip rates, high flag rates).

**Solution**: 
- Create "Question Health" analytics tab showing:
  - Questions with <30% or >90% accuracy (too hard/easy)
  - Questions with >10% flag rate
  - Questions never attempted
  - Average time per question (outliers may need revision)
- One-click to edit question or add to review queue

**Integration point**:
- Add as a sub-tab in `src/pages/admin/AnalyticsDashboard.tsx`
- Create `src/components/admin/analytics/QuestionHealthTab.tsx`

---

## Phase 3: Major Feature Additions (4-8 weeks each)

### 3.1 Parent/Guardian Portal (New User Persona)
**Problem**: Parents have no visibility into student progress.

**Solution**: 
- Create minimal parent portal accessed via unique link
- Features:
  - Weekly progress summary (practice volume, accuracy trend, attendance)
  - Upcoming SAT date countdown
  - "Is on track" indicator
  - No editing capabilities (read-only)
- Parents can opt-in to weekly email digest

**Files to create**:
- `src/pages/ParentPortal.tsx`
- `src/contexts/ParentAuthContext.tsx`
- Database: `parent_access_tokens` table linked to students

---

### 3.2 Notification & Reminder System
**Problem**: Students forget to practice; no engagement hooks outside the app.

**Solution**: 
- Email/SMS notification system for:
  - Daily practice reminders (configurable time)
  - Sprint ending soon (24h, 4h warnings)
  - Badge unlock announcements
  - At-risk warnings for teachers
- Use Lovable AI + Edge Function for generation

**Implementation**:
- Create `supabase/functions/send-notifications/index.ts`
- Add notification preferences to student/teacher settings
- Integrate with email provider (Resend connector or similar)

---

### 3.3 AI Study Coach Chatbot
**Problem**: Students get stuck on concepts with no way to get help at 2am.

**Solution**: 
- Add "Ask Coach" floating button in practice mode
- AI assistant that can:
  - Explain why an answer is wrong
  - Teach underlying concepts
  - Suggest practice areas
  - Answer SAT strategy questions
- Uses Lovable AI (no API key needed)

**Files to create**:
- `src/components/student/StudyCoachChat.tsx`
- `supabase/functions/study-coach/index.ts`

---

### 3.4 Offline Mode with Sync
**Problem**: Students in areas with poor connectivity can't practice.

**Solution**: 
- Use service worker to cache:
  - Question bank (text/images)
  - Student progress state
- Queue answers locally, sync when online
- Show "Offline Mode" indicator

**Implementation**:
- Add service worker with Vite PWA plugin
- Create sync logic in `src/lib/offlineSync.ts`
- Modify answer submission to handle queuing

---

## Phase 4: Polish & Delight (Ongoing)

### 4.1 UI/UX Refinements

| Area | Current State | Proposed Improvement |
|------|--------------|---------------------|
| Mobile Navigation | Bottom nav + sidebar | Gesture-based navigation (swipe between tabs) |
| Loading States | Basic spinners | Skeleton screens with micro-animations |
| Celebrations | Confetti on badge unlock | Haptic feedback, tier-themed celebrations |
| Dark Mode | Functional | Per-tier color themes in dark mode |
| Typography | System fonts | Custom font pairing (Chillax + JetBrains Mono for metrics) |

### 4.2 Gamification Enhancements

- **Seasonal Events**: Limited-time badges during SAT test months
- **Study Streaks**: Visual streak calendar with rewards at 7/30/100 days
- **Group Challenges**: Class vs class competitions
- **Achievement Walls**: Public leaderboard for top performers

### 4.3 Analytics Depth

- **Predictive Score Modeling**: Use historical data to predict SAT score
- **Cohort Analysis**: Compare current batch to previous batches
- **A/B Testing Framework**: Test different question orderings or UI variations

---

## Technical Debt & Infrastructure

### Performance Optimizations
- **Query Optimization**: Several dashboard queries fetch more data than needed; add pagination and caching
- **Image Optimization**: Question images should be WebP with lazy loading
- **Bundle Splitting**: Current bundle likely large; split by route

### Security Enhancements
- **RLS Audit**: Review all policies for proper student data isolation
- **Rate Limiting**: Add to edge functions to prevent abuse
- **Session Management**: Add "active sessions" view and remote logout

### Developer Experience
- **Testing**: Add E2E tests for critical flows (login, practice, test-taking)
- **Documentation**: Create internal wiki for question import process, tier mechanics
- **Error Monitoring**: Add Sentry or similar for production error tracking

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Score Target & Milestones | High | Low | P0 |
| Session Recap Modal | Medium | Low | P0 |
| Teacher Nudge Actions | Medium | Low | P0 |
| Import Session Enhancement | Medium | Low | P1 |
| Adaptive Practice Mode | High | Medium | P1 |
| Teacher Overview Grid | Medium | Medium | P1 |
| Question Health Dashboard | Medium | Medium | P1 |
| Reading Passage Simulator | High | High | P2 |
| Parent Portal | Medium | High | P2 |
| Notification System | High | High | P2 |
| AI Study Coach | High | Medium | P2 |
| Offline Mode | Medium | High | P3 |

---

## Recommended Starting Point

Begin with **Phase 1** items as they deliver immediate value with minimal risk:

1. **Score Target System** - Most impactful for student motivation
2. **Session Recap Modal** - Improves learning loop after every session
3. **Teacher Nudge Actions** - Empowers teachers to intervene quickly
4. **Import Enhancement** - Reduces admin friction for content management

These four items can be shipped within 2-3 weeks total and will measurably improve the experience for all three user personas.
