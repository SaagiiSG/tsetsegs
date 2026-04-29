## Goal

Make the entire `/admin` experience usable on mobile in a "thumb-first, 3-taps-max" layout. The desktop sidebar shell is awkward on phones today (offcanvas hides, header is sparse, dashboard cards stack into a long scroll). We'll add a dedicated mobile chrome that overlays the existing routes — no rewrites of feature pages.

## UX principles

- **3-tap rule** — every destination reachable in ≤3 taps from any admin screen.
  - Tap 1: bottom nav tab OR FAB (Command).
  - Tap 2: section/item in the sheet.
  - Tap 3: deep action (e.g. specific student, specific batch).
- **Thumb zone** — primary nav lives at the bottom, header is minimal.
- **Density over decoration** — collapse hero cards into a 2-up KPI strip; defer charts behind expandable sections.
- **Keep desktop untouched** — all changes gated by `useIsMobile()`; desktop renders the current `AdminSidebar` + layout exactly as today.

## Information architecture (5 bottom tabs)

Picked from the 18 admin routes by frequency of use:

```text
[ Home ]  [ Batches ]  [ ⌘ ]  [ Students ]  [ More ]
  /admin    /batches   FAB     /search       sheet
```

- **Home** → `/admin` (Dashboard)
- **Batches** → `/admin/batches`
- **⌘ Command** (center FAB) → opens full-screen Command Sheet (search + every route, grouped exactly like the sidebar). This is the universal escape hatch — any route in 2 taps.
- **Students** → `/admin/search` (search-first, since admins usually open a student by name)
- **More** → bottom Sheet listing the long-tail routes (SAT Schedule, Bluebook, Sprint Monitor, Review Sessions, Bug Reports, Registration Queue, Question Bank, Team, Settings, Sign Out)

The center FAB makes "More" effectively redundant for power users — but we keep both because Command requires typing/scrolling while More is a fixed grid.

## Mobile chrome components (new)

All new files live under `src/components/admin/mobile/`:

1. **`MobileAdminShell.tsx`** — wraps `<main>` on mobile. Adds:
   - Compact sticky header (40px): logo mark, page title (derived from route), Sign Out icon-only.
   - Bottom padding (`pb-20`) so content clears the nav.
   - Renders `MobileBottomNav` + `CommandSheet` + `MoreSheet`.
2. **`MobileBottomNav.tsx`** — fixed bottom bar, 5 slots, center FAB elevated. Active tab gets primary color + dot indicator. Uses `NavLink` for routing.
3. **`CommandSheet.tsx`** — full-screen `Sheet` (side="bottom", h-[92vh]) with:
   - Search input (filters by title across all routes).
   - Recently visited (last 5, stored in `localStorage`).
   - All sections from `menuSections` (reuse the array from `AdminSidebar` — extract to `src/components/admin/menuSections.ts` to share).
4. **`MoreSheet.tsx`** — bottom Sheet with a 3-column icon grid of long-tail routes + Sign Out.

## Dashboard compaction (mobile only)

Edit `DashboardStats.tsx` to switch layout based on `useIsMobile()`:

- Header: drop subtitle, shrink "Live" pill, h1 → `text-lg`.
- `HeroStatsRow`: render as 2-col grid (currently 4-col on desktop) with smaller cards — pass an `dense` prop or wrap with mobile-specific Tailwind.
- Collapse `ActivityHeatmap`, `TopicWeakSpots`, `SprintPreview`, `RecentClasses`, `AtRiskQuickView` into shadcn `Accordion` items, with **At-Risk** open by default (highest-signal for admins).
- Remove `dashboard-grid-bg` background pattern on mobile (visual noise).
- `QuickActionsBar` — convert to horizontal scroll row on mobile.

## Wiring

`src/pages/Admin.tsx`:
- Import `useIsMobile` and `MobileAdminShell`.
- On mobile: hide `AdminSidebar` + desktop header, wrap `<Routes>` in `MobileAdminShell`.
- On desktop: render exactly as today.

```text
Admin.tsx
├─ if (isMobile)
│   └─ <MobileAdminShell><Routes/></MobileAdminShell>
└─ else
    └─ <SidebarProvider><AdminSidebar/><main><Routes/></main></SidebarProvider>
```

## Files

**New**
- `src/components/admin/menuSections.ts` (extracted shared nav data)
- `src/components/admin/mobile/MobileAdminShell.tsx`
- `src/components/admin/mobile/MobileBottomNav.tsx`
- `src/components/admin/mobile/CommandSheet.tsx`
- `src/components/admin/mobile/MoreSheet.tsx`
- `src/components/admin/mobile/usePageTitle.ts` (route → title map for header)

**Edited**
- `src/pages/Admin.tsx` — branch on `useIsMobile()`.
- `src/components/admin/AdminSidebar.tsx` — import from new `menuSections.ts`.
- `src/components/admin/DashboardStats.tsx` — mobile-dense layout.
- `src/components/admin/dashboard/HeroStatsRow.tsx` — 2-col + smaller card variant on mobile.
- `src/components/admin/dashboard/QuickActionsBar.tsx` — horizontal scroll on mobile.

## Out of scope

- No changes to feature pages themselves (Question Bank, Bluebook, etc.) — those keep their current responsive behavior. We can compact them in a follow-up once the shell ships.
- No PWA/install prompts.
- No data changes, no migrations.
