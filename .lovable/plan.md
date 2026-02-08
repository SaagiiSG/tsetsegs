
# Admin Dashboard Redesign Plan

## Overview

The current `/admin` dashboard displays basic aggregate stats (total students, batches, SAT/IELTS breakdown) with two charts. This plan transforms it into a **command center** with actionable, real-time insights that surface the most important information at a glance.

## Design Philosophy

**Aesthetic Direction: "Mission Control"**
- Dark-first design with a subtle grid/dot pattern background for depth
- Monospace accent typography (JetBrains Mono for metrics) paired with the existing Chillax for headings
- Vibrant accent colors on dark surfaces: Cyan for positive metrics, Amber for warnings, Rose for alerts
- Staggered fade-in animations on page load for a polished reveal
- Glassmorphism cards with subtle backdrop blur

## Data Architecture

### Key Metrics to Surface (Based on Available Data)

| Metric | Source | Why It Matters |
|--------|--------|----------------|
| **Active Today** | `student_attempts` (last 24h) | Real-time engagement pulse |
| **This Week Attempts** | 3,162 questions | Volume indicator |
| **Platform Accuracy** | 63.4% rolling 7-day | Quality of learning |
| **Sprint Participants** | 103/107 active | Gamification health |
| **Struggling Topics** | Geometry (49.5%), Data Analysis (49%) | Intervention targets |
| **Peak Hours** | 10am, 12pm (UTC+8) | Scheduling insights |
| **At-Risk Students** | Inactive 7+ days | Retention focus |

## New Dashboard Layout

```text
+--------------------------------------------------+
|  HEADER: "Command Center" + Live pulse indicator |
+--------------------------------------------------+
|  [Hero Stats Row - 5 Cards with Sparklines]      |
|  Active Now | Weekly Volume | Accuracy | Sprint  |
|  Participation | Questions Solved                |
+--------------------------------------------------+
|  [Two-Column Grid]                               |
|  +---------------------+  +--------------------+ |
|  | ACTIVITY HEATMAP    |  | TOPIC WEAK SPOTS   | |
|  | Hour × Day matrix   |  | Horizontal bars    | |
|  | Color = intensity   |  | with accuracy %    | |
|  +---------------------+  +--------------------+ |
+--------------------------------------------------+
|  [Sprint Leaderboard Preview]                    |
|  Top 5 performers with tier badges + points      |
+--------------------------------------------------+
|  [Two-Column Grid]                               |
|  +---------------------+  +--------------------+ |
|  | RECENT CLASSES      |  | AT-RISK QUICK VIEW | |
|  | Last 6 batches      |  | Top 5 flagged      | |
|  | with teacher + size |  | students + reason  | |
|  +---------------------+  +--------------------+ |
+--------------------------------------------------+
|  [Quick Actions Bar]                             |
|  → View Analytics | → Student Search | → Sprints |
+--------------------------------------------------+
```

## Component Breakdown

### 1. Hero Stats Row
Five stat cards with:
- Large numeric value (JetBrains Mono)
- Mini sparkline showing 7-day trend
- Comparison badge (e.g., "+12% vs last week")
- Subtle glow effect on primary metric

### 2. Activity Heatmap
- 7×24 grid (days × hours)
- Color intensity based on attempt count
- Tooltip shows exact numbers
- Highlights peak practice windows

### 3. Topic Weak Spots
- Horizontal bar chart
- Categories sorted by lowest accuracy
- Color gradient: Red (bad) → Green (good)
- Shows `(X attempts)` for context

### 4. Sprint Leaderboard Preview
- Compact view of top 5 in current sprint
- Shows tier badge, name, points, rank change
- Link to full Sprint Monitor

### 5. Recent Classes
- Last 6 batches created/started
- Shows: Name, Teacher(s), Student count, Course type badge
- Click to navigate to batch analytics

### 6. At-Risk Quick View
- Top 5 highest risk students
- Shows: Name, Days inactive, Risk score badge
- Click navigates to Student Deep Dive

### 7. Quick Actions Bar
- Floating bottom bar with icon buttons
- Direct links to: Analytics, Student Search, Sprint Monitor, Question Bank

## Technical Implementation

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/admin/DashboardStats.tsx` | **Complete rewrite** |
| `src/components/admin/dashboard/HeroStatsRow.tsx` | **New** |
| `src/components/admin/dashboard/ActivityHeatmap.tsx` | **New** |
| `src/components/admin/dashboard/TopicWeakSpots.tsx` | **New** |
| `src/components/admin/dashboard/SprintPreview.tsx` | **New** |
| `src/components/admin/dashboard/RecentClasses.tsx` | **New** |
| `src/components/admin/dashboard/AtRiskQuickView.tsx` | **New** |
| `src/components/admin/dashboard/QuickActionsBar.tsx` | **New** |
| `src/hooks/useAdminDashboard.ts` | **New** - Consolidated data fetching |
| `src/index.css` | **Add** JetBrains Mono font import + grid background pattern |

### Data Fetching Strategy
Single custom hook `useAdminDashboard` that fetches all required data in parallel:
- Reuses existing hooks where available (`useAtRiskStudents`, `usePracticePatterns`)
- Adds new queries for: hourly heatmap, topic accuracy, sprint leaders
- Uses `staleTime: 5 * 60 * 1000` (5 min) for performance

### Animation Approach
- Use Tailwind's `animate-fade-in` with `animation-delay` utilities
- Stagger: 0ms, 75ms, 150ms, 225ms, 300ms for hero cards
- Cards fade in from opacity-0, translateY(10px)

## Aesthetic Details

### Color Palette (HSL)
- **Cyan accent**: `187 100% 50%` (live/active indicators)
- **Amber warning**: `43 96% 56%` (attention items)
- **Emerald success**: `142 76% 45%` (positive trends)
- **Rose alert**: `343 90% 55%` (critical issues)

### Background
```css
.dashboard-grid-bg {
  background-image: 
    radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.15) 1px, transparent 0);
  background-size: 24px 24px;
}
```

### Typography
- Stats: `font-mono tracking-tight tabular-nums`
- Headings: Existing `font-chillax` if available, else system
- Labels: `text-xs uppercase tracking-widest text-muted-foreground`

## Summary

This redesign transforms the admin dashboard from a static stats page into a dynamic command center that:
1. **Prioritizes actionable data** - What needs attention right now?
2. **Uses visual hierarchy** - Most important metrics are largest
3. **Provides context** - Sparklines and comparisons show trends
4. **Enables quick navigation** - Every card links to deeper analysis
5. **Delivers a distinctive aesthetic** - Grid patterns, monospace numbers, staggered animations

The implementation leverages existing analytics hooks while adding focused queries for dashboard-specific data, ensuring fast load times and real-time accuracy.
