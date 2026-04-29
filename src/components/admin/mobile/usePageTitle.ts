import { useLocation } from "react-router-dom";
import { allMenuItems } from "@/components/admin/menuSections";

export function usePageTitle(): string {
  const { pathname } = useLocation();

  // Exact match first
  const exact = allMenuItems.find((i) => i.url === pathname);
  if (exact) return exact.title;

  // Prefix match (longest first)
  const sorted = [...allMenuItems].sort((a, b) => b.url.length - a.url.length);
  const prefix = sorted.find((i) => pathname.startsWith(i.url + "/"));
  if (prefix) return prefix.title;

  if (pathname.startsWith("/admin/student/")) return "Student Profile";
  if (pathname.startsWith("/admin/analytics/")) return "Batch Analytics";
  return "Admin";
}
