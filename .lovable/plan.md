# HUD: free drag + collapse to any of 4 edges

Rework the Active Challenge HUD so it can be dragged anywhere on screen, and when collapsed it docks to the nearest edge (top / bottom / left / right) as a small puller tab oriented for that edge.

## Behavior

**When open (full pill):**
- Fully draggable in 2D across the viewport (not constrained to top edge).
- Position clamped inside the viewport with edge padding so it never leaves the screen.
- Swipe/flick toward the nearest edge → collapses to a puller docked to that edge at the drop location.
- Tap × or double-tap grabber → collapses to nearest edge (based on current position).
- Position persisted (edge + offset along that edge) in localStorage.

**When collapsed (puller tab):**
- Docks flush to one of 4 edges: top / bottom / left / right.
- Puller shape adapts to edge:
  - top → rounded-bottom tab, horizontal handle bar, pull DOWN to open
  - bottom → rounded-top tab, horizontal handle bar, pull UP to open
  - left → rounded-right tab, vertical handle bar, pull RIGHT to open
  - right → rounded-left tab, vertical handle bar, pull LEFT to open
- Draggable along its edge to reposition (slides left/right for top/bottom edges, up/down for left/right edges).
- Pull perpendicular to the edge (past a small threshold) OR tap → expands back to full HUD at the docked location.
- Small pulse/glow animation to hint interactivity.

## Snap logic

On drag end (open state):
- Compute center of HUD relative to viewport.
- Distance to each of the 4 edges → nearest edge wins.
- If distance to any edge is below a "dock threshold" (e.g. 60px) OR flick velocity points toward that edge → collapse to that edge.
- Otherwise stay open at the dropped (clamped) position.

On drag end (puller state):
- If perpendicular offset > threshold or velocity toward interior → expand.
- Else re-snap along the same edge at the new parallel offset.

## Persistence

Single localStorage key `challenge-hud-state-v2` storing:
```
{ open: boolean, edge: 'top'|'bottom'|'left'|'right', offset: number, openX: number, openY: number }
```
- `edge` + `offset` used when collapsed.
- `openX/openY` used when open (as pixel offsets from top-left, clamped on load in case viewport shrank).
- `challenge-hud:reset` event resets to `{ open: true, edge: 'top', offset: 0.5, openX: centered, openY: 12 }`.

## Files

- `src/components/student/challenges/ActiveChallengeHUD.tsx` — rewrite the container/positioning + puller variants. Content of the open pill (progress bar, opponent line, Play/View button, leaderboard sheet trigger) stays the same. `ChallengeLeaderboardSheet` untouched.

## Notes

- Use framer-motion `drag` with `dragConstraints` set to a ref of a full-viewport bounding box, not `{top:0,bottom:0}`, so the HUD truly moves.
- Clamp position on window resize (listener) so the HUD stays visible after rotation.
- Keep z-index at 120 (above bluebook watermark).
