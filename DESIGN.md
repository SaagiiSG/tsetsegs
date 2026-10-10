# Admin design reference

Adapted from the Vercel analysis retrieved with `npx getdesign@latest add vercel`, together with the active Apple Design and Liquid Glass skills.

## Application scope
- Admin only. Keep existing workflows, role boundaries and student/teacher styling unchanged.
- Near-white canvas, ink text, white content surfaces and crisp hairline dividers. In dark mode, use the corresponding neutral semantic tokens.
- Preserve Chillax headings and JetBrains Mono numbers; use zero letter spacing and weight/line-height for hierarchy.
- Functional controls use 6px corners. No marketing layouts or decorative mesh gradients in the dashboard.
- Reserve color for meaningful status labels and small accents, not section backgrounds.
- Keep metrics and tables unframed, using spacing and separators rather than nested cards.

## Interaction and materials
- Immediate pressed feedback, visible keyboard focus and stable control dimensions.
- Remove delayed entrance animations from navigation and frequently used controls.
- Use critically damped, interruptible motion where motion is useful; respect reduced motion.
- Use a single subtle translucent navigation material. Content and data surfaces stay solid; do not stack glass.
- Reduced transparency and increased contrast use solid navigation backgrounds.
- Sidebar routes remain reachable when collapsed, and the active section expands when navigating.

Native SwiftUI APIs in Liquid Glass are conceptual references only; this React application uses web equivalents.