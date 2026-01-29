import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, X, Minus, Maximize2, Minimize2 } from 'lucide-react';

const SNAP_THRESHOLD = 80; // pixels from edge to trigger snap zone
const SNAP_WIDTH = 40; // percentage of screen width when snapped
const MIN_WIDTH = 300;
const MIN_HEIGHT = 300;
const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;

export type SnapSide = 'left' | 'right' | null;

// Custom event for snap state changes
export const CALCULATOR_SNAP_EVENT = 'calculatorSnapChange';

// Event to toggle calculator from external sources
export const CALCULATOR_TOGGLE_EVENT = 'calculatorToggle';

export function dispatchSnapEvent(snapSide: SnapSide) {
  window.dispatchEvent(new CustomEvent(CALCULATOR_SNAP_EVENT, { detail: { snapSide } }));
}

export function toggleCalculator() {
  window.dispatchEvent(new CustomEvent(CALCULATOR_TOGGLE_EVENT));
}

// Hook for listening to snap state
export function useCalculatorSnap() {
  const [snapSide, setSnapSide] = useState<SnapSide>(null);

  useEffect(() => {
    const handleSnapChange = (e: CustomEvent<{ snapSide: SnapSide }>) => {
      setSnapSide(e.detail.snapSide);
    };

    window.addEventListener(CALCULATOR_SNAP_EVENT, handleSnapChange as EventListener);
    return () => {
      window.removeEventListener(CALCULATOR_SNAP_EVENT, handleSnapChange as EventListener);
    };
  }, []);

  return snapSide;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

export function DesmosCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [snapSide, setSnapSide] = useState<SnapSide>(null);
  const [position, setPosition] = useState({ x: 20, y: 60 });
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null);
  const [showSnapZone, setShowSnapZone] = useState<SnapSide>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentDragX, setCurrentDragX] = useState(0);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Listen for external toggle events
  useEffect(() => {
    const handleToggle = () => {
      setIsOpen(prev => !prev);
    };

    window.addEventListener(CALCULATOR_TOGGLE_EVENT, handleToggle);
    return () => {
      window.removeEventListener(CALCULATOR_TOGGLE_EVENT, handleToggle);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      if (snapSide) {
        setSnapSide(null);
        dispatchSnapEvent(null);
        setPosition({ x: e.clientX - 200, y: e.clientY - 20 });
      }
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
      if (snapSide) {
        setSnapSide(null);
        dispatchSnapEvent(null);
        setPosition({ x: e.touches[0].clientX - 200, y: e.touches[0].clientY - 20 });
      }
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      });
    }
  };

  const handleResizeStart = useCallback((e: React.MouseEvent, direction: ResizeDirection) => {
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
  }, [size, position]);

  const handleResizeTouchStart = useCallback((e: React.TouchEvent, direction: ResizeDirection) => {
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
  }, [size, position]);

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

      // Handle horizontal resizing
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

      // Handle vertical resizing
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

      // Constrain to viewport
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
        setCurrentDragX(e.clientX);
        
        const nearRightEdge = e.clientX > window.innerWidth - SNAP_THRESHOLD;
        const nearLeftEdge = e.clientX < SNAP_THRESHOLD;
        
        if (nearRightEdge) {
          setShowSnapZone('right');
        } else if (nearLeftEdge) {
          setShowSnapZone('left');
        } else {
          setShowSnapZone(null);
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.touches[0].clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, e.touches[0].clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
        setCurrentDragX(e.touches[0].clientX);
        
        const nearRightEdge = e.touches[0].clientX > window.innerWidth - SNAP_THRESHOLD;
        const nearLeftEdge = e.touches[0].clientX < SNAP_THRESHOLD;
        
        if (nearRightEdge) {
          setShowSnapZone('right');
        } else if (nearLeftEdge) {
          setShowSnapZone('left');
        } else {
          setShowSnapZone(null);
        }
      }
    };

    const handleEnd = () => {
      if (isDragging) {
        if (currentDragX > window.innerWidth - SNAP_THRESHOLD) {
          setSnapSide('right');
          dispatchSnapEvent('right');
        } else if (currentDragX < SNAP_THRESHOLD) {
          setSnapSide('left');
          dispatchSnapEvent('left');
        }
      }
      setIsDragging(false);
      setShowSnapZone(null);
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
  }, [isDragging, dragOffset, currentDragX]);

  // Notify when component unmounts while snapped
  useEffect(() => {
    return () => {
      if (snapSide) {
        dispatchSnapEvent(null);
      }
    };
  }, [snapSide]);

  // When closed, don't render anything - toggle is handled via header button
  if (!isOpen) {
    return null;
  }

  const windowWidth = snapSide ? `${SNAP_WIDTH}vw` : `${size.width}px`;
  const windowHeight = snapSide ? 'calc(100vh - 60px)' : `${size.height}px`;
  const contentHeight = snapSide ? 'calc(100vh - 60px - 44px)' : `${size.height - 44}px`;

  // Resize handle styles
  const resizeHandleBase = "absolute z-10";
  const resizeHandleEdge = "bg-transparent hover:bg-primary/20 transition-colors";
  const resizeHandleCorner = "w-3 h-3";

  return (
    <>
      {/* Left Snap Zone Indicator */}
      {showSnapZone === 'left' && (
        <div 
          className="fixed left-0 top-0 h-full z-40 pointer-events-none transition-all duration-200"
          style={{
            width: `${SNAP_WIDTH}%`,
            background: 'linear-gradient(to right, hsl(var(--primary) / 0.15), transparent)',
            borderRight: '3px solid hsl(var(--primary) / 0.6)',
            boxShadow: '10px 0 30px hsl(var(--primary) / 0.2)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-primary/20 backdrop-blur-sm rounded-lg px-6 py-3 border border-primary/30 animate-pulse">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Maximize2 className="h-5 w-5" />
                <span>Drop to snap left</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Right Snap Zone Indicator */}
      {showSnapZone === 'right' && (
        <div 
          className="fixed right-0 top-0 h-full z-40 pointer-events-none transition-all duration-200"
          style={{
            width: `${SNAP_WIDTH}%`,
            background: 'linear-gradient(to left, hsl(var(--primary) / 0.15), transparent)',
            borderLeft: '3px solid hsl(var(--primary) / 0.6)',
            boxShadow: '-10px 0 30px hsl(var(--primary) / 0.2)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-primary/20 backdrop-blur-sm rounded-lg px-6 py-3 border border-primary/30 animate-pulse">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Maximize2 className="h-5 w-5" />
                <span>Drop to snap right</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculator Window */}
      <div
        ref={windowRef}
        data-calculator-window
        className="fixed z-40 bg-background border rounded-lg shadow-2xl overflow-hidden"
        style={{
          left: snapSide === 'left' ? 0 : snapSide === 'right' ? 'auto' : position.x,
          right: snapSide === 'right' ? 0 : 'auto',
          top: snapSide ? '60px' : position.y,
          width: windowWidth,
          height: windowHeight,
          maxWidth: '95vw',
          borderRadius: snapSide ? 0 : undefined,
          transition: (isDragging || isResizing) ? 'none' : 'all 0.2s ease-out'
        }}
      >
        {/* Resize Handles - Only show when not snapped and not minimized */}
        {!snapSide && !isMinimized && (
          <>
            {/* Edge handles */}
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

            {/* Corner handles */}
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
            <Calculator className="h-4 w-4" />
            <span>Desmos Calculator</span>
            {snapSide && (
              <span className="text-xs text-muted-foreground">(snapped {snapSide})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? "Expand" : "Minimize"}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                if (snapSide) {
                  setSnapSide(null);
                  dispatchSnapEvent(null);
                  setPosition({ x: 20, y: 60 });
                } else {
                  setSnapSide('right');
                  dispatchSnapEvent('right');
                }
              }}
              title={snapSide ? "Restore" : "Snap to Side"}
            >
              {snapSide ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                if (snapSide) {
                  dispatchSnapEvent(null);
                }
                setIsOpen(false);
                setSnapSide(null);
              }}
              title="Close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Calculator Content - Keep iframe mounted but hidden when minimized */}
        <div 
          style={{ 
            height: contentHeight,
            display: isMinimized ? 'none' : 'block'
          }}
        >
          <iframe
            src="https://www.desmos.com/calculator"
            title="Desmos Graphing Calculator"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </>
  );
}
