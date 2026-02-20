import { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Eraser, Undo2, Trash2, Pen } from 'lucide-react';

interface DrawingCanvasProps {
  initialData?: string | null;
  onSave: (dataUrl: string) => void;
  width?: number;
  height?: number;
}

interface Point {
  x: number;
  y: number;
}

export function DrawingCanvas({ initialData, onSave, width = 600, height = 300 }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [strokeHistory, setStrokeHistory] = useState<ImageData[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(width);

  // Resize canvas to container width
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        if (w > 0) setCanvasWidth(w);
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  // Load initial drawing data
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = initialData;
    }
  }, [initialData, canvasWidth]);

  const getPos = useCallback((e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const saveSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setStrokeHistory(prev => [...prev.slice(-20), snapshot]);
  }, []);

  const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    saveSnapshot();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = tool === 'eraser' ? 20 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : '#000000';
    setIsDrawing(true);
  }, [getPos, tool, saveSnapshot]);

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const stopDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    setIsDrawing(false);
    // Auto-save on stroke end
    const canvas = canvasRef.current;
    if (canvas) {
      onSave(canvas.toDataURL('image/png'));
    }
  }, [isDrawing, onSave]);

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || strokeHistory.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const last = strokeHistory[strokeHistory.length - 1];
    ctx.putImageData(last, 0, 0);
    setStrokeHistory(prev => prev.slice(0, -1));
    onSave(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveSnapshot();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant={tool === 'pen' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('pen')}
        >
          <Pen className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={tool === 'eraser' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('eraser')}
        >
          <Eraser className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleUndo} disabled={strokeHistory.length === 0}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={handleClear}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={height}
        className="w-full border rounded-lg bg-white cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <p className="text-xs text-muted-foreground">Auto-saves after each stroke • Works with Apple Pencil</p>
    </div>
  );
}
