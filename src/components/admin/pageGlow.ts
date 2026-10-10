import { useLocation } from "react-router-dom";
import { menuSections } from "./menuSections";

/** Coral brand fallback for routes outside any sidebar section. */
export const DEFAULT_SECTION_GLOW = "345 75% 55%";

/**
 * Resolves the current route's sidebar section and returns its glow HSL
 * triplet, so page chrome (headers, washes) can match the section color.
 */
export function useSectionGlow(): string {
  const { pathname } = useLocation();
  const section = menuSections.find((s) =>
    s.items.some((item) =>
      item.end
        ? pathname === item.url
        : pathname === item.url || pathname.startsWith(`${item.url}/`)
    )
  );
  return section?.glow ?? DEFAULT_SECTION_GLOW;
}
