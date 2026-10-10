# Apple-style UI across Tsetsegs

## Direction
Apply **Apple Design** interaction principles and a web adaptation of **Liquid Glass** across the platform. Keep coral pink/deep indigo branding, Chillax headings, existing tier themes, and current page names and workflows.

Liquid Glass's supplied implementation is for native SwiftUI apps. On this web platform, use restrained frosted materials rather than claiming native optical refraction.

## Changes
1. **Shared design foundations:** consistent control sizes, typography hierarchy, immediate press feedback, focus states, and restrained transitions.
2. **Navigation:** unify admin/teacher/student headers, sidebars, docks, tabs, and floating controls with glass-inspired surfaces. Preserve collapse/reopen controls and current-page highlighting.
3. **Content:** keep questions, passages, answer choices, explanations, tables, charts, and videos on readable solid surfaces—not glass. Preserve all existing math rendering and exam layouts.
4. **Interactions:** improve sheets, menus, dialogs, and draggable tools with consistent opening/closing paths and interruptible motion where gestures already exist. No new gestures or workflow changes.
5. **Accessibility/performance:** honor reduced motion, reduced transparency, and increased contrast; provide opaque fallbacks where blur is unsupported. Avoid stacked blur and blur-heavy exam content.

## Technical approach
- Define semantic material/elevation tokens in global CSS for light/dark and tier themes.
- Apply shared component variants and explicit navigation classes, not broad CSS selectors that restyle every card or page.
- Use the existing motion and UI libraries; do not introduce native SwiftUI code or change data/auth/business rules.
- Record shared UI architecture rules in AGENTS.md.

## Verification
- Review signed-in admin, teacher, and student navigation, including Concept Videos.
- Exercise question editing, practice answer/review, explanation display, video navigation, and exam review without altering real student answers or active exams.
- Check desktop and narrow layouts, long English passages, figures, fractions, sidebar collapse, keyboard focus, and reduced-motion/transparency fallbacks.
- Run relevant existing tests and inspect preview diagnostics; name any role-specific checks unavailable to test.

## Already completed
- Both supplied skills are activated for relevant future requests and can be browsed with `/` in chat.
- Concept Videos was located under Admin → Tools. Sidebar expansion now follows the active page so the current section stays discoverable.