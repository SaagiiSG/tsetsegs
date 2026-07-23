import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { pdfjsLib } from "@/lib/pdfjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Search,
  X,
  Minimize2,
  Maximize2,
  Copy,
  Upload,
  FileText,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { dispatchPdfInsert } from "@/hooks/useReferencePdf";

type Mode = "free" | "left" | "right" | "top" | "bottom" | "min";
type ViewerState = { mode: Mode; x: number; y: number; w: number; h: number };

const STORAGE_KEY = "admin:module-pdf:viewer";
const DEFAULT_STATE: ViewerState = { mode: "right", x: 40, y: 60, w: 520, h: 720 };

function loadState(): ViewerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_STATE;
}
function saveState(s: ViewerState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

function rectForMode(mode: Mode, x: number, y: number, w: number, h: number) {
  const W = window.innerWidth;
  const H = window.innerHeight;
  switch (mode) {
    case "left":
      return { left: 0, top: 0, width: Math.floor(W / 2), height: H };
    case "right":
      return { left: Math.floor(W / 2), top: 0, width: Math.floor(W / 2), height: H };
    case "top":
      return { left: 0, top: 0, width: W, height: Math.floor(H / 2) };
    case "bottom":
      return { left: 0, top: Math.floor(H / 2), width: W, height: Math.floor(H / 2) };
    case "min":
      return { left: x, top: y, width: 240, height: 44 };
    default:
      return { left: x, top: y, width: w, height: h };
  }
}

interface Props {
  url: string;
  filename?: string | null;
  onClose: () => void;
  onReplace: (f: File) => void;
}

const ReferencePdfViewer = ({ url, filename, onClose, onReplace }: Props) => {
  const [state, setState] = useState<ViewerState>(loadState);
  const [snapPreview, setSnapPreview] = useState<Mode | null>(null);
  const [pdf, setPdf] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<{ page: number; index: number }[]>([]);
  const [matchIdx, setMatchIdx] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    kind: "move" | "resize";
    startX: number;
    startY: number;
    orig: ViewerState;
  } | null>(null);

  // Persist state
  useEffect(() => saveState(state), [state]);

  // Load PDF
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const doc = await loadingTask.promise;
        if (cancelled) return;
        setPdf(doc);
        setNumPages(doc.numPages);
        setPageNum(1);
      } catch (e: any) {
        console.error(e);
        toast.error("Failed to load PDF");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Render page
  useEffect(() => {
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      const page = await pdf.getPage(pageNum);
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;

      // Text layer
      const textLayer = textLayerRef.current;
      if (textLayer) {
        textLayer.innerHTML = "";
        textLayer.style.width = `${viewport.width}px`;
        textLayer.style.height = `${viewport.height}px`;
        const textContent = await page.getTextContent();
        const q = query.trim().toLowerCase();
        textContent.items.forEach((item: any) => {
          if (!item.str) return;
          const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);
          const fontHeight = Math.hypot(tx[2], tx[3]);
          const left = tx[4];
          const top = tx[5] - fontHeight;
          const span = document.createElement("span");
          span.textContent = item.str;
          span.style.position = "absolute";
          span.style.left = `${left}px`;
          span.style.top = `${top}px`;
          span.style.fontSize = `${fontHeight}px`;
          span.style.fontFamily = "sans-serif";
          span.style.color = "transparent";
          span.style.whiteSpace = "pre";
          span.style.transformOrigin = "0 0";
          span.style.cursor = "text";
          if (q && item.str.toLowerCase().includes(q)) {
            span.style.background = "rgba(255,220,0,0.45)";
            span.style.color = "rgba(0,0,0,0.001)";
          }
          textLayer.appendChild(span);
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNum, scale, query]);

  // Search across pages
  const runSearch = useCallback(
    async (q: string) => {
      if (!pdf || !q.trim()) {
        setMatches([]);
        setMatchIdx(0);
        return;
      }
      const needle = q.toLowerCase();
      const found: { page: number; index: number }[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const p = await pdf.getPage(i);
        const tc = await p.getTextContent();
        const joined = tc.items.map((it: any) => it.str).join(" ").toLowerCase();
        let from = 0;
        while (true) {
          const idx = joined.indexOf(needle, from);
          if (idx === -1) break;
          found.push({ page: i, index: idx });
          from = idx + needle.length;
        }
      }
      setMatches(found);
      setMatchIdx(0);
      if (found.length > 0) setPageNum(found[0].page);
      else toast.info("No matches");
    },
    [pdf]
  );

  const jumpMatch = (dir: 1 | -1) => {
    if (matches.length === 0) return;
    const next = (matchIdx + dir + matches.length) % matches.length;
    setMatchIdx(next);
    setPageNum(matches[next].page);
  };

  // Dragging + snapping
  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.kind === "move") {
      const nx = d.orig.x + dx;
      const ny = d.orig.y + dy;
      // Snap detection
      const W = window.innerWidth;
      const H = window.innerHeight;
      const THRESH = 48;
      let preview: Mode | null = null;
      if (e.clientX <= THRESH) preview = "left";
      else if (e.clientX >= W - THRESH) preview = "right";
      else if (e.clientY <= THRESH) preview = "top";
      else if (e.clientY >= H - THRESH) preview = "bottom";
      setSnapPreview(preview);
      setState((s) => ({ ...s, mode: "free", x: nx, y: ny }));
    } else {
      setState((s) => ({
        ...s,
        mode: "free",
        w: Math.max(320, d.orig.w + dx),
        h: Math.max(240, d.orig.h + dy),
      }));
    }
  }, []);

  const onPointerUp = useCallback(() => {
    const d = dragRef.current;
    if (d && d.kind === "move" && snapPreview) {
      setState((s) => ({ ...s, mode: snapPreview }));
    }
    setSnapPreview(null);
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove, snapPreview]);

  const startDrag = (e: React.PointerEvent, kind: "move" | "resize") => {
    e.preventDefault();
    dragRef.current = {
      kind,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...state },
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const rect = useMemo(
    () => rectForMode(state.mode, state.x, state.y, state.w, state.h),
    [state]
  );
  const snapRect = snapPreview ? rectForMode(snapPreview, 0, 0, 0, 0) : null;

  const copySelection = () => {
    const sel = window.getSelection()?.toString() ?? "";
    if (!sel.trim()) {
      toast.info("Select text in the PDF first");
      return;
    }
    dispatchPdfInsert(sel);
    toast.success("Inserted into question");
  };

  const replaceInputRef = useRef<HTMLInputElement>(null);

  if (state.mode === "min") {
    return (
      <div
        ref={containerRef}
        className="fixed z-[80] rounded-full shadow-lg border bg-background flex items-center gap-2 px-3 py-2 cursor-grab active:cursor-grabbing"
        style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
        onPointerDown={(e) => startDrag(e, "move")}
      >
        <FileText className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium truncate flex-1">{filename || "PDF"}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setState((s) => ({ ...s, mode: "free" }))}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      {snapRect && (
        <div
          className="fixed z-[75] bg-primary/10 border-2 border-primary/40 rounded-lg pointer-events-none transition-all"
          style={snapRect}
        />
      )}
      <div
        ref={containerRef}
        className="fixed z-[80] bg-background border rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-2 px-3 py-2 border-b bg-muted/40 cursor-grab active:cursor-grabbing select-none"
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
            startDrag(e, "move");
          }}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium truncate flex-1">
            {filename || "Reference PDF"}
          </span>
          <div data-no-drag className="flex items-center gap-1">
            <input
              ref={replaceInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onReplace(f);
                e.currentTarget.value = "";
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Replace PDF"
              onClick={() => replaceInputRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Minimize"
              onClick={() => setState((s) => ({ ...s, mode: "min" }))}
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="Close"
              onClick={onClose}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-background/60 text-xs flex-wrap">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={pageNum <= 1}
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="number"
            value={pageNum}
            min={1}
            max={numPages}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v)) setPageNum(Math.min(Math.max(1, v), numPages || 1));
            }}
            className="h-7 w-14 text-center text-xs"
          />
          <span className="text-muted-foreground">/ {numPages || "…"}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={pageNum >= numPages}
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground w-10 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setScale((s) => Math.min(3, s + 0.15))}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant={searchOpen ? "secondary" : "ghost"}
            size="icon"
            className="h-7 w-7"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 ml-auto"
            onClick={copySelection}
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="text-xs">Insert selection</span>
          </Button>
        </div>

        {searchOpen && (
          <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30">
            <Input
              autoFocus
              placeholder="Search PDF…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(query);
                if (e.key === "Escape") setSearchOpen(false);
              }}
              className="h-7 text-xs"
            />
            <Button size="sm" variant="secondary" className="h-7" onClick={() => runSearch(query)}>
              Find
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => jumpMatch(-1)}
              disabled={matches.length === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-[10px] text-muted-foreground w-16 text-center">
              {matches.length ? `${matchIdx + 1} / ${matches.length}` : "0 / 0"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => jumpMatch(1)}
              disabled={matches.length === 0}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Page area */}
        <div className="flex-1 overflow-auto bg-neutral-100 dark:bg-neutral-900 p-4">
          <div className="relative mx-auto" style={{ width: "fit-content" }}>
            <canvas ref={canvasRef} className="block shadow-md" />
            <div
              ref={textLayerRef}
              className="absolute inset-0 select-text"
              style={{ pointerEvents: "auto" }}
            />
          </div>
        </div>

        {/* Resize handle */}
        <div
          className={cn(
            "absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize",
            state.mode !== "free" && "hidden"
          )}
          onPointerDown={(e) => startDrag(e, "resize")}
          style={{
            background:
              "linear-gradient(135deg, transparent 50%, hsl(var(--muted-foreground) / 0.4) 50%)",
          }}
        />
      </div>
    </>
  );
};

export default ReferencePdfViewer;
