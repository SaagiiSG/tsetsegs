-- Create sprints table for 14-day competition periods
CREATE TABLE public.sprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL,
  sprint_number INTEGER NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(season_number, sprint_number)
);

-- Create badges table for badge definitions
CREATE TABLE public.badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  point_value INTEGER NOT NULL,
  icon_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('speed', 'discipline', 'championship', 'legendary')),
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_sprint_rankings table
CREATE TABLE public.student_sprint_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  sprint_id UUID NOT NULL REFERENCES public.sprints(id) ON DELETE CASCADE,
  current_tier TEXT NOT NULL DEFAULT 'bronze' CHECK (current_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby')),
  total_points INTEGER NOT NULL DEFAULT 0,
  final_rank INTEGER,
  is_top_1 BOOLEAN NOT NULL DEFAULT false,
  reserved_next_tier TEXT CHECK (reserved_next_tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'ruby')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_account_id, sprint_id)
);

-- Create point_transactions table for detailed point breakdown
CREATE TABLE public.point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  sprint_id UUID REFERENCES public.sprints(id) ON DELETE SET NULL,
  points INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('questions', 'section_bonus', 'speed_session', 'badge', 'bank_completion')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_badges table for student badge progress
CREATE TABLE public.student_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  is_unlocked BOOLEAN NOT NULL DEFAULT false,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  requirements_progress JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_account_id, badge_id)
);

-- Create featured_badges table for student's pinned showcase badges
CREATE TABLE public.featured_badges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_account_id UUID NOT NULL REFERENCES public.student_accounts(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  slot_position INTEGER NOT NULL CHECK (slot_position >= 1 AND slot_position <= 6),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_account_id, slot_position),
  UNIQUE(student_account_id, badge_id)
);

-- Enable RLS on all tables
ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sprint_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_badges ENABLE ROW LEVEL SECURITY;

-- Sprints policies (public read, admin manage)
CREATE POLICY "Anyone can view sprints" ON public.sprints FOR SELECT USING (true);
CREATE POLICY "Admins can manage sprints" ON public.sprints FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Badges policies (public read, admin manage)
CREATE POLICY "Anyone can view badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Admins can manage badges" ON public.badges FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Student sprint rankings policies
CREATE POLICY "Anyone can view rankings" ON public.student_sprint_rankings FOR SELECT USING (true);
CREATE POLICY "Public can insert rankings" ON public.student_sprint_rankings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update rankings" ON public.student_sprint_rankings FOR UPDATE USING (true);
CREATE POLICY "Admins can manage rankings" ON public.student_sprint_rankings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Point transactions policies
CREATE POLICY "Anyone can view point transactions" ON public.point_transactions FOR SELECT USING (true);
CREATE POLICY "Public can insert point transactions" ON public.point_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage point transactions" ON public.point_transactions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Student badges policies
CREATE POLICY "Anyone can view student badges" ON public.student_badges FOR SELECT USING (true);
CREATE POLICY "Public can insert student badges" ON public.student_badges FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update student badges" ON public.student_badges FOR UPDATE USING (true);
CREATE POLICY "Admins can manage student badges" ON public.student_badges FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Featured badges policies
CREATE POLICY "Anyone can view featured badges" ON public.featured_badges FOR SELECT USING (true);
CREATE POLICY "Public can insert featured badges" ON public.featured_badges FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update featured badges" ON public.featured_badges FOR UPDATE USING (true);
CREATE POLICY "Public can delete featured badges" ON public.featured_badges FOR DELETE USING (true);
CREATE POLICY "Admins can manage featured badges" ON public.featured_badges FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX idx_student_sprint_rankings_sprint ON public.student_sprint_rankings(sprint_id);
CREATE INDEX idx_student_sprint_rankings_student ON public.student_sprint_rankings(student_account_id);
CREATE INDEX idx_student_sprint_rankings_tier ON public.student_sprint_rankings(current_tier);
CREATE INDEX idx_point_transactions_student ON public.point_transactions(student_account_id);
CREATE INDEX idx_point_transactions_sprint ON public.point_transactions(sprint_id);
CREATE INDEX idx_point_transactions_created ON public.point_transactions(created_at);
CREATE INDEX idx_student_badges_student ON public.student_badges(student_account_id);
CREATE INDEX idx_student_badges_badge ON public.student_badges(badge_id);
CREATE INDEX idx_featured_badges_student ON public.featured_badges(student_account_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers
CREATE TRIGGER update_student_sprint_rankings_updated_at
  BEFORE UPDATE ON public.student_sprint_rankings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_badges_updated_at
  BEFORE UPDATE ON public.student_badges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial sprint (Season 1, Sprint 1)
INSERT INTO public.sprints (season_number, sprint_number, start_date, end_date, is_active)
VALUES (1, 1, now(), now() + INTERVAL '14 days', true);