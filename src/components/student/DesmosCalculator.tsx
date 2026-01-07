import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, X, Minus, Maximize2, Minimize2 } from 'lucide-react';

const SNAP_THRESHOLD = 80; // pixels from edge to trigger snap zone

export function DesmosCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isSnapped, setIsSnapped] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [showSnapZone, setShowSnapZone] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentDragX, setCurrentDragX] = useState(0);
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (windowRef.current) {
      // If snapped, unsnap first
      if (isSnapped) {
        setIsSnapped(false);
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
      if (isSnapped) {
        setIsSnapped(false);
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

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
        setCurrentDragX(e.clientX);
        
        // Show snap zone when near right edge
        const nearRightEdge = e.clientX > window.innerWidth - SNAP_THRESHOLD;
        setShowSnapZone(nearRightEdge);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const newX = Math.max(0, Math.min(window.innerWidth - 100, e.touches[0].clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 50, e.touches[0].clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
        setCurrentDragX(e.touches[0].clientX);
        
        const nearRightEdge = e.touches[0].clientX > window.innerWidth - SNAP_THRESHOLD;
        setShowSnapZone(nearRightEdge);
      }
    };

    const handleEnd = () => {
      // Check if should snap to right
      if (isDragging && currentDragX > window.innerWidth - SNAP_THRESHOLD) {
        setIsSnapped(true);
      }
      setIsDragging(false);
      setShowSnapZone(false);
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

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-40 gap-2 shadow-md bg-background"
        onClick={() => setIsOpen(true)}
        title="Open Graphing Calculator"
      >
        <Calculator className="h-4 w-4" />
        <span className="hidden sm:inline">Calculator</span>
      </Button>
    );
  }

  const windowWidth = isSnapped ? '50vw' : '400px';

  return (
    <>
      {/* Snap Zone Indicator - Shows when dragging near right edge */}
      {showSnapZone && (
        <div 
          className="fixed right-0 top-0 h-full w-1/2 z-40 pointer-events-none transition-all duration-200"
          style={{
            background: 'linear-gradient(to left, hsl(var(--primary) / 0.15), transparent)',
            borderLeft: '3px solid hsl(var(--primary) / 0.6)',
            boxShadow: '-10px 0 30px hsl(var(--primary) / 0.2)',
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-primary/20 backdrop-blur-sm rounded-lg px-6 py-3 border border-primary/30 animate-pulse">
              <div className="flex items-center gap-2 text-primary font-medium">
                <Maximize2 className="h-5 w-5" />
                <span>Drop to snap</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculator Window */}
      <div
        ref={windowRef}
        data-calculator-window
        className="fixed z-50 bg-background border rounded-lg shadow-2xl overflow-hidden"
        style={{
          left: isSnapped ? 'auto' : position.x,
          right: isSnapped ? 0 : 'auto',
          top: isSnapped ? 0 : position.y,
          width: windowWidth,
          height: isSnapped ? '100vh' : 'auto',
          maxWidth: '95vw',
          borderRadius: isSnapped ? 0 : undefined,
          transition: isDragging ? 'none' : 'all 0.2s ease-out'
        }}
      >
        {/* Title Bar - Draggable */}
        <div
          className="flex items-center justify-between px-3 py-2 bg-muted border-b cursor-move select-none"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Calculator className="h-4 w-4" />
            <span>Desmos Calculator</span>
            {isSnapped && (
              <span className="text-xs text-muted-foreground">(snapped)</span>
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
                if (isSnapped) {
                  setIsSnapped(false);
                  setPosition({ x: 20, y: 60 });
                } else {
                  setIsSnapped(true);
                }
              }}
              title={isSnapped ? "Restore" : "Half Screen"}
            >
              {isSnapped ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => {
                setIsOpen(false);
                setIsSnapped(false);
              }}
              title="Close"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Calculator Content */}
        {!isMinimized && (
          <div style={{ height: isSnapped ? 'calc(100vh - 44px)' : '460px' }}>
            <iframe
              src="https://www.desmos.com/calculator"
              title="Desmos Graphing Calculator"
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>
    </>
  );
}