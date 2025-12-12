import { useState, useCallback, useRef, useEffect } from 'react';

interface MarqueeState {
  isSelecting: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface UseMarqueeSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  containerRef: React.RefObject<HTMLElement>;
  rowSelector: string;
}

export function useMarqueeSelection<T>({
  items,
  getItemId,
  containerRef,
  rowSelector,
}: UseMarqueeSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [marquee, setMarquee] = useState<MarqueeState>({
    isSelecting: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  const preSelectionRef = useRef<Set<string>>(new Set());

  const getMarqueeRect = useCallback(() => {
    const { startX, startY, currentX, currentY } = marquee;
    return {
      left: Math.min(startX, currentX),
      top: Math.min(startY, currentY),
      right: Math.max(startX, currentX),
      bottom: Math.max(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
    };
  }, [marquee]);

  const rectsIntersect = (rect1: DOMRect, rect2: { left: number; top: number; right: number; bottom: number }) => {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start marquee on left click and not on interactive elements
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[role="checkbox"]') ||
      target.closest('a')
    ) {
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    preSelectionRef.current = new Set(selectedIds);

    setMarquee({
      isSelecting: true,
      startX: e.clientX - containerRect.left + scrollLeft,
      startY: e.clientY - containerRect.top + scrollTop,
      currentX: e.clientX - containerRect.left + scrollLeft,
      currentY: e.clientY - containerRect.top + scrollTop,
    });
  }, [containerRef, selectedIds]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!marquee.isSelecting) return;

    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const currentX = e.clientX - containerRect.left + scrollLeft;
    const currentY = e.clientY - containerRect.top + scrollTop;

    setMarquee(prev => ({ ...prev, currentX, currentY }));

    // Calculate which rows intersect with marquee
    const marqueeRect = {
      left: Math.min(marquee.startX, currentX),
      top: Math.min(marquee.startY, currentY),
      right: Math.max(marquee.startX, currentX),
      bottom: Math.max(marquee.startY, currentY),
    };

    const rows = container.querySelectorAll(rowSelector);
    const newSelected = new Set(preSelectionRef.current);

    rows.forEach((row, index) => {
      const rowRect = row.getBoundingClientRect();
      const adjustedRowRect = {
        left: rowRect.left - containerRect.left + scrollLeft,
        top: rowRect.top - containerRect.top + scrollTop,
        right: rowRect.right - containerRect.left + scrollLeft,
        bottom: rowRect.bottom - containerRect.top + scrollTop,
        width: rowRect.width,
        height: rowRect.height,
      } as DOMRect;

      if (items[index]) {
        const id = getItemId(items[index]);
        if (rectsIntersect(adjustedRowRect, marqueeRect)) {
          newSelected.add(id);
        } else if (!preSelectionRef.current.has(id)) {
          newSelected.delete(id);
        }
      }
    });

    setSelectedIds(newSelected);
  }, [marquee, containerRef, rowSelector, items, getItemId]);

  const handleMouseUp = useCallback(() => {
    setMarquee(prev => ({ ...prev, isSelecting: false }));
  }, []);

  // Global mouse up listener
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (marquee.isSelecting) {
        setMarquee(prev => ({ ...prev, isSelecting: false }));
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [marquee.isSelecting]);

  const handleRowClick = useCallback((index: number, id: string, e: React.MouseEvent) => {
    // Ignore clicks on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('[role="checkbox"]') ||
      target.closest('a')
    ) {
      return;
    }

    if (e.shiftKey && lastClickedIndex !== null) {
      // Shift+click: select range from last clicked to current
      const start = Math.min(lastClickedIndex, index);
      const end = Math.max(lastClickedIndex, index);
      const newSelected = new Set(selectedIds);
      
      for (let i = start; i <= end; i++) {
        if (items[i]) {
          newSelected.add(getItemId(items[i]));
        }
      }
      setSelectedIds(newSelected);
    } else if (e.altKey && selectedIds.size > 0) {
      // Alt+click: select range from any selected to current
      const selectedIndices = items
        .map((item, idx) => selectedIds.has(getItemId(item)) ? idx : -1)
        .filter(idx => idx !== -1);
      
      if (selectedIndices.length > 0) {
        const lastSelectedIndex = selectedIndices[selectedIndices.length - 1];
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        const newSelected = new Set(selectedIds);
        
        for (let i = start; i <= end; i++) {
          if (items[i]) {
            newSelected.add(getItemId(items[i]));
          }
        }
        setSelectedIds(newSelected);
      }
    } else {
      // Regular click: toggle selection
      const newSelected = new Set(selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      setSelectedIds(newSelected);
      setLastClickedIndex(index);
    }
  }, [lastClickedIndex, selectedIds, items, getItemId]);

  const toggleSelect = useCallback((id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    
    // Update last clicked index
    const index = items.findIndex(item => getItemId(item) === id);
    if (index !== -1) {
      setLastClickedIndex(index);
    }
  }, [selectedIds, items, getItemId]);

  const toggleSelectAll = useCallback(() => {
    if (items.length > 0 && selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(item => getItemId(item))));
    }
  }, [items, selectedIds.size, getItemId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  return {
    selectedIds,
    setSelectedIds,
    marquee,
    getMarqueeRect,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleRowClick,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
  };
}
