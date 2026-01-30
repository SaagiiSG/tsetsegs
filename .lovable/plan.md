

# Epic Rank Advancement Celebration Flow

## Overview

Create a dramatic, multi-step celebration sequence when a student advances to a new tier. The flow consists of:

1. **Rank Reveal** - Full dark screen with the new tier appearing slowly + points collected
2. **Badge Unlock** - Lock-to-unlock animation with the tier badge
3. **Claim Interaction** - Subtle button to claim and record the achievement

---

## Visual Sequence Flow

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                     CELEBRATION SEQUENCE FLOW                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   STEP 1: RANK REVEAL                                                   │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • Screen fades to complete black (opacity: 100%)               │   │
│   │  • 1 second pause (dramatic tension)                            │   │
│   │  • New tier name fades in slowly ("DIAMOND")                    │   │
│   │  • Tier-colored glow pulses behind text                         │   │
│   │  • Points earned counter animates up from 0                     │   │
│   │  • "You've Advanced!" subtitle appears                          │   │
│   │  • Subtle "Next" button fades in after 3 seconds                │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│   STEP 2: BADGE LOCKED                                                  │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • Screen stays dark                                            │   │
│   │  • Badge appears at 0% opacity with a LOCK overlay              │   │
│   │  • Badge slowly fades in (0% → 100% over 2 seconds)             │   │
│   │  • Lock icon sits on center of badge                            │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│   STEP 3: LOCK FALLS OFF                                                │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • When badge reaches 100% opacity                              │   │
│   │  • Lock shakes briefly                                          │   │
│   │  • Lock falls with gravity + rotation animation                 │   │
│   │  • Lock fades out as it falls                                   │   │
│   │  • Badge bursts with glow effect on unlock                      │   │
│   │  • Particle effects emanate from badge                          │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│   STEP 4: CLAIM                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │  • Badge name and description fade in                           │   │
│   │  • Point value shows: "+1,000 points"                           │   │
│   │  • Subtle "Claim Badge" button fades in                         │   │
│   │  • Button has gentle pulse animation                            │   │
│   │  • Clicking navigates to /practice/badges                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### New Component: `RankAdvancementCelebration.tsx`

A single, self-contained component that manages the entire sequence using internal state machine.

**Props:**
```text
interface RankAdvancementCelebrationProps {
  isOpen: boolean
  onComplete: () => void
  previousTier: TierType
  newTier: TierType
  pointsEarned: number
  sprintNumber: number
  seasonNumber: number
  badge: BadgeDefinition | null  // null if not P1 (no badge)
}
```

**Internal State Machine:**
```text
type CelebrationPhase = 
  | 'darkening'      // 0-500ms: Screen going dark
  | 'rank-reveal'    // 500ms-4s: New tier appearing
  | 'badge-locked'   // 4s-6s: Badge with lock fading in
  | 'lock-falling'   // 6s-7s: Lock animation
  | 'unlocked'       // 7s+: Badge unlocked, claim button visible
```

---

## Animation Specifications

### Phase 1: Darkening (0-500ms)
- Background: `rgba(0, 0, 0, 0)` → `rgba(0, 0, 0, 1)`
- Duration: 500ms
- Easing: `easeInOut`

### Phase 2: Rank Reveal (500ms-4s)
- Tier name starts at `opacity: 0, scale: 0.8, y: 30`
- Animates to `opacity: 1, scale: 1, y: 0`
- Duration: 1.5s with `spring` physics
- Radial glow behind text pulses
- Points counter uses `react-countup` from 0 to actual value
- "Next" button fades in at 3.5s mark

### Phase 3: Badge Locked (4s-6s)
- Badge container at `opacity: 0`
- Slowly fades to `opacity: 1` over 2 seconds
- Lock icon positioned center of badge
- Lock has slight bob animation while waiting

### Phase 4: Lock Falls (6s-7s)
- Lock shakes: `x: [-2, 2, -2, 2, 0]` over 300ms
- Lock falls: `y: 0 → 500, rotate: 0 → 45deg, opacity: 1 → 0`
- Duration: 700ms with `easeIn` (gravity feel)
- Badge bursts: `scale: [1, 1.2, 1.05]`
- Glow intensifies
- Particle burst: 30 particles radiate outward

### Phase 5: Unlocked (7s+)
- Badge name fades in: 300ms
- Description fades in: 500ms delay
- Point value fades in: 700ms delay
- "Claim Badge" button fades in: 1s delay
- Button has gentle scale pulse: `scale: [1, 1.03, 1]` repeating

---

## Integration Points

### Modify: `StudentLeaderboard.tsx`

Replace `SprintEndCelebration` and `EpicBadgeUnlock` with the new unified `RankAdvancementCelebration` component when advancing ranks.

**Logic:**
1. On sprint end, check if user is advancing (rank <= cutoff for their tier)
2. If advancing → show `RankAdvancementCelebration`
3. If NOT advancing but got P1 → show existing `SprintEndCelebration` + `EpicBadgeUnlock`
4. If NOT advancing and NOT P1 → show simple `SprintEndCelebration`

### Data Flow
```text
Sprint Ends
    │
    ▼
Check: Is user advancing to new tier?
    │
    ├── YES → RankAdvancementCelebration
    │           • previousTier: current tier
    │           • newTier: reserved_next_tier
    │           • badge: tier badge if P1, null otherwise
    │
    └── NO → SprintEndCelebration (existing)
              └── If P1 → EpicBadgeUnlock (existing)
```

---

## Technical Details

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/student/leaderboard/RankAdvancementCelebration.tsx` | Main celebration component |
| `src/components/student/leaderboard/LockFallAnimation.tsx` | Reusable lock-falling animation |

### Files to Modify

| File | Change |
|------|---------|
| `src/pages/student/StudentLeaderboard.tsx` | Add advancement detection logic, integrate new component |
| `src/components/student/leaderboard/index.ts` | Export new components |

### Animation Dependencies
- `framer-motion` - Already installed, used for all animations
- `react-countup` - Already installed, used for points counter
- `lucide-react` - Already installed, `Lock` icon for the lock animation

---

## Lock Fall Animation Details

The lock falling animation is the key dramatic moment:

```text
┌───────────────────────────────────────┐
│          LOCK FALL SEQUENCE           │
├───────────────────────────────────────┤
│                                       │
│    Frame 0-300ms: SHAKE               │
│    ┌─────┐  ┌─────┐  ┌─────┐          │
│    │ 🔒 │→ │ 🔒 │→ │ 🔒 │           │
│    └─────┘  └─────┘  └─────┘          │
│      ←2px    →2px     center          │
│                                       │
│    Frame 300-1000ms: FALL             │
│         🔒                            │
│          ↓                            │
│           🔒  ← rotate 15deg          │
│            ↓                          │
│             🔒  ← rotate 30deg        │
│              ↓   opacity fading       │
│               · ← disappears          │
│                                       │
└───────────────────────────────────────┘
```

---

## Subtle Button Styling

The "Next" and "Claim Badge" buttons should be subtle and elegant:

```text
• Low opacity initially (0.6)
• Hover increases to 1.0
• Thin border matching tier color
• Background: transparent or very subtle tier color
• Text: tier color
• Gentle pulse animation to draw attention
```

---

## Tier-Specific Theming

Each tier has distinct colors that will be used throughout:

| Tier | Primary Color | Glow Effect |
|------|---------------|-------------|
| Bronze | #CD7F32 | Warm copper glow |
| Silver | #C0C0C0 | Cool metallic sheen |
| Gold | #FFD700 | Rich golden radiance |
| Platinum | #E5E4E2 | Elegant platinum shimmer |
| Diamond | #B9F2FF | Brilliant ice-blue sparkle |
| Ruby | #E0115F | Deep crimson pulse |

---

## Edge Cases

1. **No Badge Unlock (Not P1)**: Skip the badge reveal phases, just show rank reveal with congratulations
2. **Ruby Tier (Top tier)**: Special "Ruby Champion" celebration variant
3. **Screen Tap to Skip**: Allow tapping anywhere (except buttons) to speed up animations
4. **Mobile Responsiveness**: All elements scale appropriately for mobile viewports

