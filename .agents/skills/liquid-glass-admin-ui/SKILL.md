---
name: liquid-glass-admin-ui
description: Use when restyling or adding UI to the admin dashboard or center (customer) portals in this project. Triggers on "liquid glass", "UI update", "admin redesign", "glow", "glassmorphism", "sidebar", "top bar", "monochrome admin".
---

# Liquid Glass Admin UI

The platform's admin and center-portal design language. Apply it to admin/center surfaces only — student and teacher pages keep their own styling.

## Core direction

- **Monochrome data surfaces, color only for meaning.** Notion/Linear-like neutral admin: cards, tables, and text stay neutral; the existing coral/indigo brand colors appear only in labels, statuses, and section glows. Never introduce new decorative color on data surfaces.
- **Glass lives on navigation, not data.** Sidebar and top bar are translucent frosted glass; cards and tables stay solid enough to read. Stacked blur over data kills legibility and performance.
- **Softened corners.** Admin base radius 12px; student surfaces 16px fields / 14px buttons. Use the shared radius tokens, never ad-hoc values.

## The glass recipe

Glass surfaces combine: translucent background, `backdrop-blur`, a specular top edge (1px lighter inner border), and a soft shadow. In dark mode raise the background alpha slightly so text stays readable. Every glass style MUST have a reduced-transparency / forced-colors fallback that swaps to a solid surface — defined once in `src/index.css` as semantic classes (e.g. `.admin-glass-card`, `.admin-glass-card-glow`), not inline utilities.

Key implementation lessons from building this:

- Put the glass on the **floating card itself**, not on an inner wrapper — an inner frosted layer with `overflow-hidden` produces visible square-corner cut-offs inside the rounded card and clips tooltips.
- Hide sidebar scrollbars with CSS but keep wheel/trackpad scrolling.
- The sidebar **floats** as a detached rounded card (page background visible around it); collapsed it becomes a slim icon rail with a small breathing gap so it never blocks content. Tooltips need a z-index above the card edge.
- The top bar blurs content scrolling beneath it; its leading corner rounds to match the floating sidebar card, the window-edge side stays square and flush.

## Section glows

Each nav section has a signature HSL glow (Overview 217 91% 60%, Batches 262 83% 62%, Students 152 60% 42%, Tools 32 95% 50%, Admin/Center 345 75% 55%, coral fallback). The glow belongs on **page headers and the top bar** (tinted underline), resolved by prefix-matching the current route against menu URLs — see `src/components/admin/pageGlow.ts` (`useSectionGlow()`) and `menuSections.ts`. Do NOT put per-section colors on sidebar dividers; the sidebar stays a single clean glass with only subtle tinted hover/active states.

Batch/card glow variant: `.admin-glass-card-glow` rises from the card's **left edge** (gradient wash + 2px glowing edge, content at z-index 1, stronger alphas in dark mode).

### Liquid (hero) cards

Cards meant to feel like poured glass (teacher class cards, center batch/roster cards) add `.admin-glass-liquid` on top of `.admin-glass-card`: a near-transparent fill (0.27 light / 0.22 dark), `blur(10px) saturate(2.3) brightness(1.04)`, a white specular border, a pointer-tracked specular (`--lx/--ly`), a drifting conic `.admin-liquid-sheen` and a masked 1px `.admin-liquid-rim`. Use `useLiquidHighlight` (cards) or `liquidTrack`/`liquidRest` (list items) from `src/hooks/useLiquidHighlight.ts` and render `<LiquidGlassFX />` inside the card — never hand-roll pointer handlers or a second sheen implementation.

**Legibility floor — never trade contrast for frost.** Thin glass over a moving background washes small text out:
- Keep the card fill ≥ ~0.25 alpha with blur ≥ 10px; below that, secondary text disappears.
- Give dense columns their own inner glass layer (`.admin-glass-inner`): a low-alpha fill, hairline border and specular top edge, **no second blur** — stacked blur costs performance.
- Micro-labels (≤12px) must not use `text-muted-foreground` at a fractional opacity; the admin theme's muted-foreground is only ~3:1 on light surfaces. Use `text-foreground/65…/70`, which reads correctly in both modes.
- Verify with computed contrast (element color composited over the sampled background pixel) in both modes, every label ≥ 4.5:1. A screenshot alone hides this class of failure — measure it.

## Buttons and controls

Solid buttons read as tinted glass; outline/ghost as clear glass; all get a press-down spring feel. Show/hide password toggles use `src/portal/PasswordInput.tsx`.

## Center (customer) portals

- The center admin shell (`src/portal/CenterAdminPortal.tsx`) **reuses the main admin's sidebar primitives** (`SidebarProvider`/`Sidebar`, floating + icon-collapsible) so both workspaces share collapse behavior, tooltips, and the glass card. Extend the shared primitives — never fork a second nav implementation.
- Center portals have their own dark mode toggle (Settings → Appearance + top-bar sun/moon) and per-center branding from `institution_customers.portal_settings`.
- `PortalShell` in `centerContext.tsx` has an opt-in `glass` prop: when true it adds the admin-theme lifecycle, an `admin-glass-bar` header and a green (152 60% 42%) section glow. Used by the center teacher portal; the center student portal stays plain. The main teacher dashboard (`TeacherDashboard.tsx`) also uses the admin-theme lifecycle with per-mode glows (dashboard 217, analytics 262, practice 152, tests/intense 32, proctor 345).
- Center pages read only `tenant_*` tables plus the shared read-only question bank; never mount main admin pages inside a portal.

## Process habits

- Verify glass changes with Playwright in **both light and dark mode**, desktop and mobile widths, signed in as the relevant role — light mode contrast regressions are the most common failure.
- Keep build/typecheck clean (`tsgo --noEmit -p tsconfig.app.json`) before reporting done.
