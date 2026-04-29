import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MobileBottomNav } from "./MobileBottomNav";
import { CommandSheet } from "./CommandSheet";
import { MoreSheet } from "./MoreSheet";
import { usePageTitle } from "./usePageTitle";
import flowersLogo from "@/assets/flowers-logo.png";

interface MobileAdminShellProps {
  children: React.ReactNode;
}

export function MobileAdminShell({ children }: MobileAdminShellProps) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const title = usePageTitle();
  const isHome = title === "Dashboard" || title === "Admin";

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Compact header */}
      <header className="sticky top-0 z-30 h-12 bg-background/95 backdrop-blur-md border-b border-border flex items-center px-3 gap-2">
        {isHome ? (
          <img src={flowersLogo} alt="" className="w-7 h-7 rounded object-contain" />
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 -ml-1"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}
        <h1 className="text-sm font-semibold flex-1 truncate">{title}</h1>
        {import.meta.env.DEV && (
          <span className="px-1.5 py-0.5 text-[9px] font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded border border-amber-500/30">
            DEV
          </span>
        )}
      </header>

      {/* Content */}
      <main className="px-3 py-3 pb-24">{children}</main>

      {/* Bottom nav */}
      <MobileBottomNav
        onCommandClick={() => setCmdOpen(true)}
        onMoreClick={() => setMoreOpen(true)}
      />

      {/* Sheets */}
      <CommandSheet open={cmdOpen} onOpenChange={setCmdOpen} />
      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  );
}
