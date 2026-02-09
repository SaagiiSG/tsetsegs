-- Add study streaks tracking table
CREATE TABLE public.student_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  streak_start_date DATE,
  total_practice_days INTEGER NOT NULL DEFAULT 0,
  streak_7_achieved BOOLEAN NOT NULL DEFAULT false,
  streak_30_achieved BOOLEAN NOT NULL DEFAULT false,
  streak_100_achieved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_student_streak UNIQUE (student_account_id)
);

-- Enable RLS
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;

-- Students can read and update their own streak data
CREATE POLICY "Students can view their own streak"
  ON public.student_streaks
  FOR SELECT
  USING (true);

CREATE POLICY "Students can update their own streak"
  ON public.student_streaks
  FOR UPDATE
  USING (true);

CREATE POLICY "Students can insert their own streak"
  ON public.student_streaks
  FOR INSERT
  WITH CHECK (true);

-- Add seasonal events table for limited-time badges
CREATE TABLE public.seasonal_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  badge_id TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  event_type TEXT NOT NULL DEFAULT 'sat_month',
  icon_name TEXT DEFAULT 'Calendar',
  theme_color TEXT DEFAULT '#F59E0B',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seasonal_events ENABLE ROW LEVEL SECURITY;

-- Everyone can read seasonal events
CREATE POLICY "Anyone can view seasonal events"
  ON public.seasonal_events
  FOR SELECT
  USING (true);

-- Add trigger for streak updates
CREATE TRIGGER update_student_streaks_updated_at
  BEFORE UPDATE ON public.student_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();