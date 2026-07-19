import { useState } from "react";
import { motion, useMotionValue, useDragControls, animate, PanInfo } from "framer-motion";
import { LayoutDashboard, TrendingUp, Gamepad2, BookOpen, GripVertical, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DashboardMode = "dashboard" | "analytics" | "practice";
type DockAnchor =
  | "bottom" | "top" | "left" | "right"
  | "top-left" | "top-right" | "bottom-left" | "bottom-right";

const ANCHOR_ALIGN: Record<DockAnchor, string> = {
  bottom: "items-end justify-center pb-4",
  top: "items-start justify-center pt-4",
  left: "items-center justify-start pl-4",
  right: "items-center justify-end pr-4",
  "top-left": "items-start justify-start pt-4 pl-4",
  "top-right": "items-start justify-end pt-4 pr-4",
  "bottom-left": "items-end justify-start pb-4 pl-4",
  "bottom-right": "items-end justify-end pb-4 pr-4",
};

const VERTICAL_ANCHORS: DockAnchor[] = ["left", "right"];
const SPRING = { type: "spring" as const, stiffness: 260, damping: 26, mass: 0.8 };
const EDGE_KEY = "teacher:mode-dock:edge:v2";
const VALID = new Set<DockAnchor>([
  "bottom","top","left","right","top-left","top-right","bottom-left","bottom-right"
]);

function loadAnchor(): DockAnchor {
  if (typeof window === "undefined") return "bottom";
  const v = window.localStorage.getItem(EDGE_KEY) as DockAnchor | null;
  return v && VALID.has(v) ? v : "bottom";
}

interface Props {
  activeMode: DashboardMode;
  onChange: (m: DashboardMode) => void;
  onOpenHandbook: () => void;
}

export function TeacherModeDock({ activeMode, onChange, onOpenHandbook }: Props) {
  const [anchor, setAnchor] = useState<DockAnchor>(() => loadAnchor());
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useDragControls();

  const isVertical = VERTICAL_ANCHORS.includes(anchor);
  const GripIcon = isVertical ? GripHorizontal : GripVertical;

  const navItems = [
    { mode: "dashboard" as const, icon: LayoutDashboard, label: "Dashboard" },
    { mode: "analytics" as const, icon: TrendingUp, label: "Analytics" },
    { mode: "practice" as const, icon: Gamepad2, label: "Practice" },
  ];

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const px = info.point.x;
    const py = info.point.y;
    const cornerMargin = 0.22; // if within 22% of both axes → corner
    const nearLeft = px < w * cornerMargin;
    const nearRight = px > w * (1 - cornerMargin);
    const nearTop = py < h * cornerMargin;
    const nearBottom = py > h * (1 - cornerMargin);

    let next: DockAnchor;
    if (nearTop && nearLeft) next = "top-left";
    else if (nearTop && nearRight) next = "top-right";
    else if (nearBottom && nearLeft) next = "bottom-left";
    else if (nearBottom && nearRight) next = "bottom-right";
    else {
      const dists: Record<"left"|"right"|"top"|"bottom", number> = {
        left: px / w,
        right: 1 - px / w,
        top: py / h,
        bottom: 1 - py / h,
      };
      next = (Object.keys(dists) as Array<"left"|"right"|"top"|"bottom">)
        .reduce((a, b) => (dists[a] < dists[b] ? a : b));
    }

    animate(x, 0, SPRING);
    animate(y, 0, SPRING);
    setAnchor(next);
    try { window.localStorage.setItem(EDGE_KEY, next); } catch { /* noop */ }
  };

  return (
    <div className={cn("fixed inset-0 z-50 pointer-events-none flex transition-[padding] duration-300", ANCHOR_ALIGN[anchor])}>
      <motion.div
        layout
        transition={SPRING}
        drag
        dragMomentum={false}
        dragElastic={0.15}
        dragListener={false}
        dragControls={controls}
        onDragEnd={handleDragEnd}
        whileDrag={{ scale: 1.05 }}
        style={{ x, y }}
        className={cn(
          "pointer-events-auto select-none flex items-center gap-2",
          isVertical ? "flex-col" : "flex-row"
        )}
      >
        {/* Grip handle — iPadOS style, the only drag surface */}
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          aria-label="Drag dock"
          title="Drag to reposition"
          className={cn(
            "touch-none cursor-grab active:cursor-grabbing rounded-full bg-card/95 backdrop-blur-sm border shadow-lg text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center",
            isVertical ? "w-11 h-6" : "h-11 w-6"
          )}
        >
          <GripIcon className="h-4 w-4" />
        </button>

        <motion.div
          layout
          transition={SPRING}
          className={cn(
            "flex items-center gap-1 bg-card/95 backdrop-blur-sm border shadow-lg rounded-full p-1",
            isVertical ? "flex-col" : "flex-row"
          )}
        >
          {navItems.map(({ mode, icon: Icon, label }) => {
            const active = activeMode === mode;
            const btn = (
              <Button
                variant={active ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-9 rounded-full gap-2 text-xs transition-all",
                  isVertical ? "px-3 md:w-9 md:px-0" : "px-3"
                )}
                onClick={() => onChange(mode)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className={isVertical ? "hidden" : "hidden sm:inline"}>{label}</span>
              </Button>
            );
            return isVertical ? (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>{btn}</TooltipTrigger>
                <TooltipContent side={anchor === "left" ? "right" : "left"}>{label}</TooltipContent>
              </Tooltip>
            ) : (
              <div key={mode}>{btn}</div>
            );
          })}
        </motion.div>

        {/* Mobile-only handbook shortcut */}
        <Button
          variant="default"
          size="icon"
          className="md:hidden h-11 w-11 rounded-full shadow-lg bg-card/95 backdrop-blur-sm border text-foreground hover:bg-card"
          onClick={onOpenHandbook}
          aria-label="Open handbook on this phone"
        >
          <BookOpen className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
}
