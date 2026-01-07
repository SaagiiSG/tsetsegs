import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calculator, X, Minus, Maximize2, Minimize2 } from 'lucide-react';

export function DesmosCalculator() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullWidth, setIsFullWidth] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

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

  const windowWidth = isFullWidth ? '50vw' : '400px';
  const windowHeight = isMinimized ? 'auto' : isFullWidth ? 'calc(100vh - 80px)' : '500px';

  return (
    <div
      ref={windowRef}
      className="fixed z-50 bg-background border rounded-lg shadow-2xl overflow-hidden"
      style={{
        left: isFullWidth ? 'auto' : position.x,
        right: isFullWidth ? 0 : 'auto',
        top: isFullWidth ? 60 : position.y,
        width: windowWidth,
        maxWidth: '95vw',
        transition: isDragging ? 'none' : 'width 0.2s, height 0.2s'
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
              setIsFullWidth(!isFullWidth);
              if (!isFullWidth) {
                setPosition({ x: 20, y: 60 });
              }
            }}
            title={isFullWidth ? "Restore" : "Half Screen"}
          >
            {isFullWidth ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
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

      {/* Calculator Content */}
      {!isMinimized && (
        <div style={{ height: isFullWidth ? 'calc(100vh - 120px)' : '460px' }}>
          <iframe
            src="https://www.desmos.com/calculator"
            title="Desmos Graphing Calculator"
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      )}
    </div>
  );
}