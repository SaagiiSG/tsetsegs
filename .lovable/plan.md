## Goal
On iPad-sized viewports, replace the sidebar with a floating dock that surfaces the 5 most-used destinations plus a "More" button that reveals the full navigation.

## Breakpoint scope
- Mobile (<768px): keep existing `StudentBottomNav`.
- iPad (≥768px and <1280px, i.e. `md` up to `xl`): new floating dock, sidebar hidden.
- Desktop (≥1280px `xl`): keep existing `StudentDashboardSidebar`.

Reason: existing bottom nav already claims mobile; iPad portrait (768) and landscape (1024) both fall in md/lg. Desktop keeps the richer sidebar.

## New component: `StudentIPadDock`
Location: `src/components/student/StudentIPadDock.tsx`

Visual:
- Floating pill, `fixed bottom-6 left-1/2 -translate-x-1/2 z-40`, `hidden md:flex xl:hidden`.
- Rounded-full glass container: `bg-card/80 backdrop-blur-xl border border-border/60 shadow-2xl px-2 py-2 gap-1`.
- Each item: 56×56 rounded-2xl button, icon 22px, tiny label under icon on hover/active. Active item gets `bg-primary/15 text-primary` and a soft glow.
- Uses `NavLink`/`useLocation` for active state, matches sidebar's active logic (`pathname === to || startsWith(to + '/')`).
- Framer Motion: subtle scale on hover/tap, spring pop-in on mount.

Primary items (in order):
1. Dashboard → `/practice/home`
2. Practice → `/practice/dashboard`
3. Speed → `/practice/speed`
4. Leaderboard → `/practice/leaderboard`
5. Challenges → `/practice/challenges`
6. More (three-dot icon `MoreHorizontal`) → opens sheet

"More" behavior:
- Opens a shadcn `Sheet` from the bottom containing the full sidebar nav (Learning, Community, Account groups) sourced from the same items array used in `StudentDashboardSidebar`. Refactor: extract the nav-items arrays from `StudentDashboardSidebar.tsx` into `src/components/student/nav/studentNavItems.ts` so both the sidebar and the dock's More sheet share one source of truth.
- Sheet items are grouped with labels, use `NavLink`, and close the sheet on navigate.

## Layout wiring
File: `src/components/student/StudentLayout.tsx`
- Import and render `<StudentIPadDock />` alongside `<StudentBottomNav />`.
- Hide the sidebar on iPad: wrap `<StudentDashboardSidebar />` in a `<div className="hidden xl:contents">` (or apply `hidden xl:block` inside the sidebar root). Since `Sidebar` from shadcn manages its own root, easier path: wrap in `<div className="hidden xl:block">`.
- Hide the header `SidebarTrigger` on iPad range too (`hidden xl:inline-flex`) since there is no sidebar to toggle there.
- Add bottom padding to `<main>` on iPad so the dock never covers content: change `pb-16 md:pb-0` to `pb-16 md:pb-24 xl:pb-0`.

## Files
- Add: `src/components/student/StudentIPadDock.tsx`
- Add: `src/components/student/nav/studentNavItems.ts` (shared nav items)
- Edit: `src/components/student/StudentDashboardSidebar.tsx` — import items from shared file, wrap render (or leave and rely on layout wrapper); keep behavior identical on desktop.
- Edit: `src/components/student/StudentLayout.tsx` — mount dock, hide sidebar + trigger below `xl`, adjust main padding.

## Out of scope
- No changes to mobile bottom nav.
- No changes to routes, auth, or sidebar contents on desktop.
- No changes to the FAB / command sheet.
