import { useStudentAuth } from '@/contexts/StudentAuthContext';

export function WatermarkOverlay() {
  const { student } = useStudentAuth();
  
  if (!student) return null;
  
  const linkedStudent = student.linked_student;
  
  // Build watermark text
  const studentName = linkedStudent 
    ? `${linkedStudent.first_name} ${linkedStudent.last_name || ''}`.trim()
    : student.phone_number;
  
  const phoneNumber = student.phone_number;
  
  // Create watermark pattern
  const watermarkText = `${studentName} | ${phoneNumber}`;
  
  // Create multiple watermark positions for full coverage
  const watermarks = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 3; col++) {
      watermarks.push({
        id: `${row}-${col}`,
        top: `${15 + row * 20}%`,
        left: `${10 + col * 35}%`,
        rotation: -25 + (row % 2) * 10
      });
    }
  }

  return (
    <div 
      className="fixed inset-0 pointer-events-none z-30 overflow-hidden select-none"
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
            color: 'rgba(128, 128, 128, 0.15)',
            textShadow: '0 0 1px rgba(128, 128, 128, 0.1)',
            letterSpacing: '0.05em',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            pointerEvents: 'none'
          }}
        >
          {watermarkText}
        </div>
      ))}
    </div>
  );
}
