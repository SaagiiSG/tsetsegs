
# Leaderboard, Badge Tracking & Profile Pages Implementation

## Overview
This plan implements three major gaming-inspired pages for the SAT prep platform:
1. **Leaderboard Page** - Competitive sprint-based rankings with tier system
2. **Badge Tracking Page** - Achievement collection with progress tracking
3. **Profile Page** - Comprehensive student dashboard with activity visualization

---

## Database Schema Changes

### New Tables Required

**1. `sprints` table** - Manages 14-day competition periods
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| season_number | integer | Season (e.g., Season 3) |
| sprint_number | integer | Sprint within season |
| start_date | timestamp | Sprint start |
| end_date | timestamp | Sprint end |
| is_active | boolean | Current active sprint |

**2. `student_sprint_rankings` table** - Tracks student rankings per sprint
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| student_account_id | uuid | Foreign key |
| sprint_id | uuid | Foreign key to sprints |
| current_tier | text | bronze/silver/gold/platinum/diamond/ruby |
| total_points | integer | Accumulated points |
| final_rank | integer | Final position (set at sprint end) |
| is_top_1 | boolean | Won the sprint |
| reserved_next_tier | text | Reserved tier for next season |

**3. `point_transactions` table** - Detailed point breakdown
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| student_account_id | uuid | Foreign key |
| sprint_id | uuid | Foreign key |
| points | integer | Points earned |
| category | text | questions/section_bonus/speed_session/badge/bank_completion |
| created_at | timestamp | When earned |

**4. `badges` table** - Badge definitions
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Badge name |
| description | text | Requirements description |
| rarity | text | common/uncommon/rare/epic/legendary |
| point_value | integer | Points awarded |
| icon_name | text | Lucide icon name |
| category | text | speed/discipline/championship/legendary |
| requirements | jsonb | Structured requirements |

**5. `student_badges` table** - Student badge progress
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| student_account_id | uuid | Foreign key |
| badge_id | uuid | Foreign key |
| progress | integer | 0-100 percentage |
| is_unlocked | boolean | Badge earned |
| unlocked_at | timestamp | When earned |
| requirements_progress | jsonb | Detailed progress per requirement |

**6. `featured_badges` table** - Student's pinned showcase badges
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| student_account_id | uuid | Foreign key |
| badge_id | uuid | Foreign key |
| slot_position | integer | 1-6 position |

---

## Page 1: Leaderboard (`/practice/leaderboard`)

### File Structure
```
src/
├── pages/student/
│   └── StudentLeaderboard.tsx (complete rewrite)
├── components/student/leaderboard/
│   ├── SprintTimer.tsx
│   ├── LeaderboardTabs.tsx
│   ├── CurrentSprintTab.tsx
│   ├── AllTimeTab.tsx
│   ├── MyRankTab.tsx
│   ├── LeaderboardRow.tsx
│   ├── TierFilter.tsx
│   ├── PointsBreakdownTooltip.tsx
│   └── HallOfFame.tsx
├── hooks/
│   └── useLeaderboard.ts
```

### Key Components

**SprintTimer** - Countdown display
- Shows "Season X - Sprint Y"
- Countdown: days:hours:mins remaining
- Progress bar for sprint duration

**LeaderboardRow** - Individual player row
- Rank with crown icon for #1
- Username and level
- Total points with hover tooltip for breakdown
- Promotion status badges:
  - Green "ADVANCING" for promotion zone
  - Yellow "AT RISK" for just below cutoff
- Animated point changes

**TierFilter** - Dropdown to filter by rank tier
- Colors: Bronze (#CD7F32), Silver (#C0C0C0), Gold (#FFD700), Platinum (#E5E4E2), Diamond (#B9F2FF), Ruby (#E0115F)

**Promotion Cutoffs Logic**:
- Bronze: Top 30 advance to Silver
- Silver: Top 20 advance to Gold
- Gold: Top 15 advance to Platinum
- Platinum: Top 10 advance to Diamond
- Diamond: Top 5 advance to Ruby
- Ruby: Top 1 retains Ruby rank

### Data Hook: `useLeaderboard`
```typescript
interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  level: number;
  totalPoints: number;
  currentTier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'ruby';
  isAdvancing: boolean;
  isTop1: boolean;
  reservedNextTier: string | null;
  pointsBreakdown: {
    questions: number;
    sectionBonuses: number;
    speedSessions: number;
    badges: number;
    bankCompletions: number;
  };
}
```

---

## Page 2: Badge Tracking (`/practice/badges`)

### File Structure
```
src/
├── pages/student/
│   └── StudentBadges.tsx (new)
├── components/student/badges/
│   ├── BadgeGrid.tsx
│   ├── BadgeCard.tsx
│   ├── BadgeDetailModal.tsx
│   ├── BadgeFilters.tsx
│   ├── BadgeStatsOverview.tsx
│   ├── BadgeProgressSection.tsx
│   └── BadgeUnlockCelebration.tsx
├── hooks/
│   └── useBadges.ts
├── data/
│   └── badgeDefinitions.ts
```

### Badge Definitions (hardcoded initially)

**Speed Badges - Common (300 pts)**
- Lightning Strike: 10 questions under 5 min, 80%+ accuracy
- Speedster: 20 questions under 5 min, 90%+ accuracy
- Hot Streak: 5 speed sessions over 5 consecutive days
- Chain Lightning: 3 consecutive perfect speed drills

**Speed Badges - Uncommon (500 pts)**
- Peak of Speed: 10 speed sessions with 95%+ accuracy

**Discipline Badges - Rare (1000 pts)**
- Blitz: Complete Module 1 in under 15 minutes
- Discipline King: 20+ consecutive days of speed + practice
- Sniper: 10 consecutive correct in under 8 minutes
- Rush Delivery: 20 consecutive correct in under 12 minutes

**Elite Badges - Epic (2000 pts)**
- Time Lord: 50 questions under 17 min, 90%+ accuracy
- Flawless Execution: Zero mistakes in practice test, under 30 min
- God Amongst Human: Hold Top 1 all-time for 3 consecutive weeks
- Problem Slayer: 300 problems solved correctly on first try

**Sprint Championship - Rare (1000 pts)**
- Bronze Novice: Top 1 in Bronze Sprint
- Silver Challenger: Top 1 in Silver Sprint
- Gold Scholar: Top 1 in Gold Sprint

**Sprint Championship - Epic (2000 pts)**
- Platinum Legend: Top 1 in Platinum Sprint
- Diamond Apex: Top 1 in Diamond Sprint

**Legendary Badges (30000 pts)**
- The Penguin: All 68 questions + All 1074 CB problems + 750+ avg + 100% vocab
- The Glacier Penguin: The Penguin + All English bank
- Ruby Legend: Ruby rank for 4 consecutive weeks

### Key Components

**BadgeCard** - Individual badge display
- Rarity-based glow effects and borders
- Progress bar for incomplete badges
- Lock/unlock status indicator
- Point value display

**BadgeDetailModal** - Full badge info
- Large icon with effects
- Requirements checklist with progress
- Tips for earning
- Recent earners list

**BadgeUnlockCelebration** - Unlock animation
- Confetti effect (react-confetti already installed)
- Badge zoom-in animation
- Points counter animation

### Rarity Visual Hierarchy
| Rarity | Border Color | Glow | Animation |
|--------|--------------|------|-----------|
| Common | Gray | Subtle | None |
| Uncommon | Green | Moderate | Gentle pulse |
| Rare | Blue | Strong | Strong pulse |
| Epic | Purple | Intense | Sparkle effect |
| Legendary | Gold/Red gradient | Constant glow | Particle effects |

---

## Page 3: Profile Page (`/practice/profile`)

### File Structure
```
src/
├── pages/student/
│   └── StudentProfile.tsx (new)
├── components/student/profile/
│   ├── ProfileHeader.tsx
│   ├── ActivityHeatmap.tsx
│   ├── FeaturedBadges.tsx
│   ├── CourseHistoryTimeline.tsx
│   ├── PerformanceStatsGrid.tsx
│   ├── LevelProgressCard.tsx
│   ├── RankHistoryGraph.tsx
│   └── RecentAchievementsFeed.tsx
├── hooks/
│   └── useStudentProfile.ts
```

### Key Components

**ProfileHeader**
- Avatar (circular, 120px) with initials fallback
- Username in large bold text
- Level display with metallic styling
- Progress bar to next level
- Total accumulated points
- Current rank tier with icon
- Last login and account creation date

**ActivityHeatmap** - GitHub-style 365-day grid
- Color intensity based on daily points:
  - Very light: 0-100 pts
  - Light: 101-500 pts
  - Medium: 501-1000 pts
  - Dark: 1001+ pts
- Hover tooltip with date and details
- Current streak display with fire icon
- Longest streak record

**FeaturedBadges** - 6 pinnable badges
- Large badge cards with rarity glow
- Empty slots with "Pin a badge" placeholder
- Quick stats summary (earned/total, points, rarest)

**CourseHistoryTimeline** - Scrollable vertical timeline
- Date, topic, score, time, points for each entry
- Filter by Math/English
- Milestone markers (100th problem, 1000th, etc.)
- Lazy loading with infinite scroll

**PerformanceStatsGrid** - 2x2 card grid
- Questions: total solved, accuracy, avg time
- Speed Sessions: completed, avg time, best time, perfect sessions
- Practice Tests: taken, avg score, best score, trend
- Streak Record: longest, current, total active days

**LevelProgressCard**
- Large circular progress indicator
- Current level in center
- Formula display: Level = 200 + 50 x 2^x
- Points needed for next level
- Level history graph

**RankHistoryGraph** - Line chart
- X-axis: Sprint numbers
- Y-axis: Tier levels
- Badge icons at earning moments
- Color-coded by tier

**RecentAchievementsFeed** - Activity feed
- Trophy/arrow/fire/chart icons by type
- Timestamp (relative)
- Points gained
- Clickable to view details

---

## Technical Implementation Details

### Point Calculation System
Points are calculated from:
1. **Questions Solved**: 10 pts per correct answer
2. **Section Bonuses**: 50 pts for completing a category
3. **Speed Sessions**: 25 pts per session completed
4. **Badge Acquisitions**: Badge point value when earned
5. **Bank Completions**: 100 pts for completing 68/CB bank

### Level Formula
```
Level = floor(log2((totalPoints - 200) / 50) + 1)
```
Inverse to show points needed:
```
Points for Level N = 200 + 50 * 2^(N-1)
```

### Sprint Management
- Sprints run for 14 days
- Automatic tier promotion/demotion at sprint end
- Top 1 reserves their tier for next season
- New season resets everyone to Bronze

### Real-time Updates
- Use Supabase realtime subscriptions for:
  - Leaderboard point changes (every 30s polling fallback)
  - Badge unlock notifications
  - Rank changes

### Animations (Framer Motion)
- Rank changes: slide up/down animation
- Point increases: counter animation
- Badge unlocks: scale + glow animation
- Tab switches: fade + slide transitions

---

## Routing Updates

Add to `App.tsx`:
```typescript
<Route path="badges" element={<StudentBadges />} />
<Route path="profile" element={<StudentProfile />} />
```

Update `StudentBottomNav.tsx` to include new navigation items.

---

## Implementation Order

1. **Database migrations** - Create all new tables with RLS policies
2. **Badge definitions** - Create `badgeDefinitions.ts` with all badges
3. **Data hooks** - `useLeaderboard`, `useBadges`, `useStudentProfile`
4. **Leaderboard page** - Complete rewrite with all components
5. **Badge page** - New page with all components
6. **Profile page** - New page with all components
7. **Navigation updates** - Add routes and nav items
8. **Point transaction triggers** - Database functions to award points
9. **Badge progress triggers** - Database functions to update badge progress

---

## Files to Create/Modify

### New Files (25+ files)
- `src/pages/student/StudentBadges.tsx`
- `src/pages/student/StudentProfile.tsx`
- `src/components/student/leaderboard/*.tsx` (8 files)
- `src/components/student/badges/*.tsx` (7 files)
- `src/components/student/profile/*.tsx` (8 files)
- `src/hooks/useLeaderboard.ts`
- `src/hooks/useBadges.ts`
- `src/hooks/useStudentProfile.ts`
- `src/data/badgeDefinitions.ts`

### Modified Files
- `src/pages/student/StudentLeaderboard.tsx` - Complete rewrite
- `src/App.tsx` - Add routes
- `src/components/student/StudentBottomNav.tsx` - Add nav items
- `src/components/student/StudentSidebar.tsx` - Add nav items

### Database Migrations
- Create `sprints` table
- Create `student_sprint_rankings` table
- Create `point_transactions` table
- Create `badges` table
- Create `student_badges` table
- Create `featured_badges` table
- Create point calculation triggers
- Create badge progress update triggers
- Add RLS policies for all tables

---

## Estimated Complexity
- **New components**: 25+ files
- **New database tables**: 6 tables
- **Database triggers/functions**: 4-5
- **Lines of code**: ~4000-5000
