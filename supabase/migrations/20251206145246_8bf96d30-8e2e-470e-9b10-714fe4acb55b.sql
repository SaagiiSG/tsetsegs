-- Add 'excused' value to the attendance_status enum
ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'excused';