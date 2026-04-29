import { Home, GraduationCap, Search, MoreHorizontal, Command } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

interface MobileBottomNavProps {
  onCommandClick: () => void;
  onMoreClick: () => void;
}

const tabs = [
  { to: "/admin", label: "Home", icon: Home, end: true },
  { to: "/admin/batches", label: "Batches", icon: GraduationCap },
  { to: "/admin/search", label: "Students", icon: Search },
];

export function MobileBottomNav({ onCommandClick, onMoreClick }: MobileBottomNavProps) {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-md border-t border-border h-16 pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-16 max-w-md mx-auto relative">
        {/* Home */}
        <NavTab to={tabs[0].to} label={tabs[0].label} Icon={tabs[0].icon} end active={pathname === "/admin"} />
        {/* Batches */}
        <NavTab to={tabs[1].to} label={tabs[1].label} Icon={tabs[1].icon} active={pathname.startsWith("/admin/batches")} />

        {/* Center FAB */}
        <button
          onClick={onCommandClick}
          aria-label="Command menu"
          className="relative flex items-center justify-center"
        >
          <span className="absolute -top-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform">
            <Command className="w-6 h-6" />
          </span>
        </button>

        {/* Students */}
        <NavTab to={tabs[2].to} label={tabs[2].label} Icon={tabs[2].icon} active={pathname.startsWith("/admin/search") || pathname.startsWith("/admin/student")} />

        {/* More */}
        <button
          onClick={onMoreClick}
          className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground active:text-foreground"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </div>
    </nav>
  );
}

function NavTab({
  to, label, Icon, end, active,
}: { to: string; label: string; Icon: React.ComponentType<{ className?: string }>; end?: boolean; active: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 transition-colors",
        active ? "text-primary" : "text-muted-foreground"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
      {active && <span className="absolute top-1 w-1 h-1 rounded-full bg-primary" />}
    </NavLink>
  );
}
