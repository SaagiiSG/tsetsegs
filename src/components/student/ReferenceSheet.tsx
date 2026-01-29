import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, X, Minus, Maximize2, Minimize2 } from 'lucide-react';
import referenceSheetImage from '@/assets/sat-reference-sheet.jpg';

// Event to toggle reference sheet from external sources
export const REFERENCE_TOGGLE_EVENT = 'referenceSheetToggle';

export function toggleReferenceSheet() {
  window.dispatchEvent(new CustomEvent(REFERENCE_TOGGLE_EVENT));
}

const MIN_WIDTH = 350;
const MIN_HEIGHT = 300;
const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 450;

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

export function ReferenceSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 80 });
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Listen for external toggle events
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };

    window.addEventListener(REFERENCE_TOGGLE_EVENT, handleToggle);
    return () => {
      window.removeEventListener(REFERENCE_TOGGLE_EVENT, handleToggle);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (windowRef.current && e.touches.length === 1) {
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y
    });
  };

  const handleResizeTouchStart = (e: React.TouchEvent, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.touches.length === 1) {
      setIsResizing(true);
      setResizeDirection(direction);
      setResizeStart({
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        width: size.width,
        height: size.height,
        posX: position.x,
        posY: position.y
      });
    }
  };

  // Handle resize
  useEffect(() => {
    const handleResizeMove = (clientX: number, clientY: number) => {
      if (!isResizing || !resizeDirection) return;

      const deltaX = clientX - resizeStart.x;
      const deltaY = clientY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.posX;
      let newY = resizeStart.posY;

      if (resizeDirection.includes('e')) {
        newWidth = Math.max(MIN_WIDTH, resizeStart.width + deltaX);
      }
      if (resizeDirection.includes('w')) {
        const potentialWidth = resizeStart.width - deltaX;
        if (potentialWidth >= MIN_WIDTH) {
          newWidth = potentialWidth;
          newX = resizeStart.posX + deltaX;
        }
      }
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(MIN_HEIGHT, resizeStart.height + deltaY);
      }
      if (resizeDirection.includes('n')) {
        const potentialHeight = resizeStart.height - deltaY;
        if (potentialHeight >= MIN_HEIGHT) {
          newHeight = potentialHeight;
          newY = resizeStart.posY + deltaY;
        }
      }

      newWidth = Math.min(newWidth, window.innerWidth - newX - 10);
      newHeight = Math.min(newHeight, window.innerHeight - newY - 10);

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleResizeMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleResizeMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isResizing, resizeDirection, resizeStart]);

  // Handle drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.touches[0].clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, e.touches[0].clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, dragOffset]);

  if (!isOpen) {
    return null;
  }

  const resizeHandleBase = "absolute z-10";
  const resizeHandleEdge = "bg-transparent hover:bg-primary/20 transition-colors";
  const resizeHandleCorner = "w-3 h-3";

  return (
    <div
      ref={windowRef}
      data-reference-window
      className="fixed z-40 bg-background border rounded-lg shadow-2xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: `${size.width}px`,
        height: isMinimized ? 'auto' : `${size.height}px`,
        maxWidth: '95vw',
        transition: (isDragging || isResizing) ? 'none' : 'all 0.2s ease-out'
      }}
    >
      {/* Resize Handles - Only show when not minimized */}
      {!isMinimized && (
        <>
          <div 
            className={`${resizeHandleBase} ${resizeHandleEdge} top-0 left-3 right-3 h-1 cursor-n-resize`}
            onMouseDown={(e) => handleResizeStart(e, 'n')}
            onTouchStart={(e) => handleResizeTouchStart(e, 'n')}
          />
          <div 
            className={`${resizeHandleBase} ${resizeHandleEdge} bottom-0 left-3 right-3 h-1 cursor-s-resize`}
            onMouseDown={(e) => handleResizeStart(e, 's')}
            onTouchStart={(e) => handleResizeTouchStart(e, 's')}
          />
          <div 
            className={`${resizeHandleBase} ${resizeHandleEdge} left-0 top-3 bottom-3 w-1 cursor-w-resize`}
            onMouseDown={(e) => handleResizeStart(e, 'w')}
            onTouchStart={(e) => handleResizeTouchStart(e, 'w')}
          />
          <div 
            className={`${resizeHandleBase} ${resizeHandleEdge} right-0 top-3 bottom-3 w-1 cursor-e-resize`}
            onMouseDown={(e) => handleResizeStart(e, 'e')}
            onTouchStart={(e) => handleResizeTouchStart(e, 'e')}
          />
          <div 
            className={`${resizeHandleBase} ${resizeHandleCorner} top-0 left-0 cursor-nw-resize`}
            onMouseDown={(e) => handleResizeStart(e, 'nw')}
            onTouchStart={(e) => handleResizeTouchStart(e, 'nw')}
          />
          <div 
            className={`${resizeHandleBase} ${resizeHandleCorner} top-0 right-0 cursor-ne-resize`}
            onMouseDown={(e) => handleResizeStart(e, 'ne')}
            onTouchStart={(e) => handleResizeTouchStart(e, 'ne')}
          />
          <div 
            className={`${resizeHandleBase} ${resizeHandleCorner} bottom-0 left-0 cursor-sw-resize`}
            onMouseDown={(e) => handleResizeStart(e, 'sw')}
            onTouchStart={(e) => handleResizeTouchStart(e, 'sw')}
          />
          <div 
            className={`${resizeHandleBase} ${resizeHandleCorner} bottom-0 right-0 cursor-se-resize`}
            onMouseDown={(e) => handleResizeStart(e, 'se')}
            onTouchStart={(e) => handleResizeTouchStart(e, 'se')}
          />
        </>
      )}

      {/* Title Bar */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-muted border-b cursor-move select-none"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="h-4 w-4" />
          <span>Reference Sheet</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => setIsOpen(false)}
            title="Close"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div 
        className="overflow-auto"
        style={{ 
          height: isMinimized ? 0 : `${size.height - 44}px`,
          display: isMinimized ? 'none' : 'block'
        }}
      >
        <img 
          src={referenceSheetImage} 
          alt="SAT Math Reference Sheet"
          className="w-full h-auto"
          draggable={false}
        />
      </div>
    </div>
  );
}

// Button component to trigger the reference sheet
export function ReferenceSheetButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => toggleReferenceSheet()}
      className="gap-2"
    >
      <BookOpen className="h-4 w-4" />
      <span className="hidden sm:inline">Reference</span>
    </Button>
  );
}
