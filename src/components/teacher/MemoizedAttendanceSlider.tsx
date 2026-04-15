import { memo, useCallback } from "react";
import { AttendanceSlider } from "./AttendanceSlider";

type AttendanceStatus = "present" | "late" | "absent" | "sick" | "excused" | "";

interface MemoizedAttendanceSliderProps {
  studentId: string;
  sessionNumber: number;
  value: AttendanceStatus;
  onUpdate: (studentId: string, session: number, value: string) => void;
}

export const MemoizedAttendanceSlider = memo(function MemoizedAttendanceSlider({
  studentId,
  sessionNumber,
  value,
  onUpdate,
}: MemoizedAttendanceSliderProps) {
  const handleChange = useCallback(
    (newValue: AttendanceStatus) => {
      onUpdate(studentId, sessionNumber, newValue);
    },
    [studentId, sessionNumber, onUpdate]
  );

  return <AttendanceSlider value={value} onChange={handleChange} />;
});
