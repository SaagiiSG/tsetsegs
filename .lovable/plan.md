

# Tier Advancement & P1 Protection Update

## Summary

Two key changes to the sprint finalization logic:
1. **Update tier advancement cutoffs** to your specified values
2. **Fix P1 protection** so only Sprint 3 P1 protects against season-end demotion

---

## 1. Tier Advancement Cutoffs

### Current Values (lines 9-17)
```text
unranked: 50, bronze: 30, silver: 20, gold: 15, platinum: 10, diamond: 5, ruby: 1
```

### New Values
| Tier | Advance Count | To Tier |
|------|---------------|---------|
| Unranked | Top 30 | Bronze |
| Bronze | Top 20 | Silver |
| Silver | Top 15 | Gold |
| Gold | Top 10 | Platinum |
| Platinum | Top 5 | Diamond |
| Diamond | Top 1 | Ruby |
| Ruby | Top 1 stays | Ruby (others drop to Diamond) |

---

## 2. Ruby Tier Special Logic

Currently, the advancement logic (lines 156-157) doesn't handle Ruby's "drop to Diamond" rule:
```typescript
const isAdvancing = rank <= cutoff && currentTierIndex < TIER_ORDER.length - 1
const reservedNextTier = isAdvancing ? nextTier : tier
```

**New Logic:**
- If tier is Ruby and rank is 1: stay at Ruby
- If tier is Ruby and rank > 1: drop to Diamond
- All other tiers: use cutoff-based advancement

---

## 3. P1 Protection - Sprint 3 Only

### Current Behavior (lines 304-358)
The code tracks `bestP1Tier` across all 3 sprints and uses it to protect against demotion.

### New Behavior
- **Remove** the `bestP1Tier` tracking entirely
- Only check if the student got P1 in Sprint 3
- P1 in Sprint 1 or 2 awards badges but provides NO protection at season end

### Changes Required

**Remove from Map structure (lines 304-308):**
```typescript
// Remove bestP1Tier field
const studentData = new Map<string, {
  finalTier: string
  sprint3Ranking: any | null  // Only this needed
}>()
```

**Remove bestP1Tier tracking (lines 326-334):**
```typescript
// Remove this entire block that tracks P1 across sprints
if (ranking.is_top_1 && ranking.reserved_next_tier) {
  // ... all this logic removed
}
```

**Remove protection check (lines 350-358):**
```typescript
// Remove this entire block
if (data.bestP1Tier) {
  // ... protection logic removed
}
```

---

## Updated Season-End Flow

```text
For each student at Season End (Sprint 3):

1. Did they get P1 in Sprint 3?
   → YES: Keep promoted tier, skip demotion
   → NO: Apply demotion (drop 1 tier)

2. P1 in Sprint 1 or 2?
   → Badge awarded ✓
   → NO protection at season end ✗
```

---

## Advancement Visualization

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                      TIER ADVANCEMENT LADDER                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   RUBY ────────────────────────────────────────────────────────────     │
│    │    Top 1 stays at Ruby                                             │
│    │    Others DROP to Diamond                                          │
│    │                                                                    │
│   DIAMOND ─────────────────────────────────────────────────────────     │
│    ↑    Top 1 advances to Ruby                                          │
│    │                                                                    │
│   PLATINUM ────────────────────────────────────────────────────────     │
│    ↑    Top 5 advance to Diamond                                        │
│    │                                                                    │
│   GOLD ────────────────────────────────────────────────────────────     │
│    ↑    Top 10 advance to Platinum                                      │
│    │                                                                    │
│   SILVER ──────────────────────────────────────────────────────────     │
│    ↑    Top 15 advance to Gold                                          │
│    │                                                                    │
│   BRONZE ──────────────────────────────────────────────────────────     │
│    ↑    Top 20 advance to Silver                                        │
│    │                                                                    │
│   UNRANKED ────────────────────────────────────────────────────────     │
│         Top 1 advances to Bronze                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Group Competition Examples

| Tier | Group Size | Advance | Stay/Drop |
|------|------------|---------|-----------|
| Unranked | 40 | 1 | 39 stay |
| Bronze | 40 | 20 | 20 stay |
| Silver | 40 | 15 | 25 stay |
| Gold | 40 | 10 | 30 stay |
| Platinum | 40 | 5 | 35 stay |
| Diamond | 40 | 1 | 39 stay |
| Ruby | 40 | 1 stays | 39 drop to Diamond |

---

## Technical Changes

### File: `supabase/functions/finalize-sprint/index.ts`

| Section | Change |
|---------|--------|
| Lines 9-17 | Update `TIER_PROMOTION_CUTOFFS` with new values |
| Lines 153-168 | Add Ruby-specific demotion logic |
| Lines 304-334 | Remove `bestP1Tier` tracking |
| Lines 350-358 | Remove P1 protection from earlier sprints |

