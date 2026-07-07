import { useEffect, useRef, useState } from 'react';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

export function WatermarkOverlay() {
  const { student } = useStudentAuth();
  const rootRef = useRef<HTMLDivElement>(null);
  const originalParentRef = useRef<HTMLElement | null>(null);
  const [, forceRender] = useState(0);

  // Re-parent the watermark into the fullscreen element so it stays visible
  // when a student enters fullscreen (e.g. video). Native fullscreen only
  // renders the fullscreen element's subtree, so a body-level fixed overlay
  // would otherwise disappear.
  useEffect(() => {
    if (!student) return;

    const handleFullscreenChange = () => {
      const node = rootRef.current;
      if (!node) return;
      const fsEl = (document.fullscreenElement ||
        (document as any).webkitFullscreenElement) as HTMLElement | null;

      if (fsEl) {
        if (!originalParentRef.current) {
          originalParentRef.current = node.parentElement;
        }
        if (node.parentElement !== fsEl) {
          fsEl.appendChild(node);
        }
      } else if (originalParentRef.current) {
        originalParentRef.current.appendChild(node);
        originalParentRef.current = null;
      }
      forceRender((n) => n + 1);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange as any);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange as any);
    };
  }, [student]);

  if (!student) return null;

  const linkedStudent = student.linked_student;
  const studentName = linkedStudent
    ? `${linkedStudent.first_name} ${linkedStudent.last_name || ''}`.trim()
    : student.phone_number;
  const phoneNumber = student.phone_number;
  const watermarkText = `${studentName} | ${phoneNumber}`;

  const watermarks = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      watermarks.push({
        id: `${row}-${col}`,
        top: `${15 + row * 20}%`,
        left: `${10 + col * 35}%`,
        rotation: -25 + (row % 2) * 10,
      });
    }
  }

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 pointer-events-none z-[2147483647] overflow-hidden select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      aria-hidden="true"
    >
      {watermarks.map((pos) => (
        <div
          key={pos.id}
          className="absolute whitespace-nowrap text-xs md:text-sm font-medium"
          style={{
            top: pos.top,
            left: pos.left,
            transform: `rotate(${pos.rotation}deg)`,
            color: 'rgba(128, 128, 128, 0.2)',
            textShadow: '0 0 1px rgba(128, 128, 128, 0.1)',
            letterSpacing: '0.05em',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          {watermarkText}
        </div>
      ))}
    </div>
  );
}
