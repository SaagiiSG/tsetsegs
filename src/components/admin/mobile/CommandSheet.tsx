import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Search, Clock } from "lucide-react";
import { menuSections, allMenuItems, type MenuItem } from "@/components/admin/menuSections";
import { cn } from "@/lib/utils";

const RECENT_KEY = "admin-mobile-recent-routes";

interface CommandSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandSheet({ open, onOpenChange }: CommandSheetProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setQuery("");
      try {
        const raw = localStorage.getItem(RECENT_KEY);
        setRecent(raw ? JSON.parse(raw) : []);
      } catch { setRecent([]); }
    }
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return allMenuItems.filter((i) => i.title.toLowerCase().includes(q));
  }, [query]);

  const recentItems = useMemo(
    () => recent.map((url) => allMenuItems.find((i) => i.url === url)).filter(Boolean) as MenuItem[],
    [recent]
  );

  const handleNav = (item: MenuItem) => {
    try {
      const next = [item.url, ...recent.filter((u) => u !== item.url)].slice(0, 5);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {}
    onOpenChange(false);
    navigate(item.url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="text-left text-base">Jump to…</SheetTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search admin pages…"
              className="pl-9 h-11"
            />
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-2 pb-6">
          {filtered ? (
            <div className="py-2">
              {filtered.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No matches</p>
              )}
              {filtered.map((item) => (
                <ItemRow key={item.url} item={item} onClick={() => handleNav(item)} />
              ))}
            </div>
          ) : (
            <>
              {recentItems.length > 0 && (
                <section className="py-2">
                  <SectionLabel icon={Clock} label="Recent" />
                  {recentItems.map((item) => (
                    <ItemRow key={item.url} item={item} onClick={() => handleNav(item)} />
                  ))}
                </section>
              )}

              {menuSections.map((section) => (
                <section key={section.label} className="py-2">
                  <SectionLabel icon={section.icon} label={section.label} />
                  {section.items.map((item) => (
                    <ItemRow key={item.url} item={item} onClick={() => handleNav(item)} />
                  ))}
                </section>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

function ItemRow({ item, onClick }: { item: MenuItem; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-3 rounded-lg",
        "hover:bg-muted/50 active:bg-muted text-left transition-colors"
      )}
    >
      <span className="w-9 h-9 rounded-md bg-muted/40 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-foreground" />
      </span>
      <span className="text-sm font-medium">{item.title}</span>
    </button>
  );
}
