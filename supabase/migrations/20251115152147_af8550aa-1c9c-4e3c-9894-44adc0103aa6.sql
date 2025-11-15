-- Create enum for teachers
CREATE TYPE public.teacher_name AS ENUM (
  'Saran-Ochir',
  'Altan-Erdene',
  'Manlai'
);

-- Create enum for rooms
CREATE TYPE public.room_number AS ENUM (
  '1105',
  '905'
);

-- Create batches table
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher public.teacher_name NOT NULL,
  schedule TEXT NOT NULL,
  room public.room_number NOT NULL,
  start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create students table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  unique_link_id TEXT UNIQUE NOT NULL,
  accessed BOOLEAN DEFAULT false NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create index for unique link lookups
CREATE INDEX idx_students_unique_link ON public.students(unique_link_id);

-- Enable RLS
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Public access policies (no auth needed for this use case)
CREATE POLICY "Allow all access to batches" ON public.batches FOR ALL USING (true);
CREATE POLICY "Allow all access to students" ON public.students FOR ALL USING (true);