/**
 * Decorative layers that make a glass card read as liquid:
 *  - `.admin-liquid-sheen` — a slow light drifting inside the glass
 *  - `.admin-liquid-rim`   — a specular rim that catches the section glow
 *
 * Purely visual, never interactive. Drop it inside any card carrying
 * `admin-glass-card admin-glass-card-glow admin-glass-liquid`.
 */
export function LiquidGlassFX() {
  return (
    <>
      <div aria-hidden className="admin-liquid-sheen" />
      <div aria-hidden className="admin-liquid-rim" />
    </>
  );
}
