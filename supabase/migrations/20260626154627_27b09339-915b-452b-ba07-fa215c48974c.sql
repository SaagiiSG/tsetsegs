
ALTER TABLE public.student_streaks
  ADD COLUMN IF NOT EXISTS freezers_available integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freezers_earned_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freezer_last_used_date date,
  ADD COLUMN IF NOT EXISTS last_daily_xp_date date,
  ADD COLUMN IF NOT EXISTS milestone_3_achieved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_10_achieved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_14_achieved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_15_achieved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS milestone_21_achieved boolean NOT NULL DEFAULT false;

-- Widen badges.category to allow 'streak'
ALTER TABLE public.badges DROP CONSTRAINT IF EXISTS badges_category_check;
ALTER TABLE public.badges ADD CONSTRAINT badges_category_check
  CHECK (category = ANY (ARRAY['speed','discipline','championship','legendary','streak','seasonal']));

-- Widen point_transactions.category to allow 'streak_daily'
ALTER TABLE public.point_transactions DROP CONSTRAINT IF EXISTS point_transactions_category_check;
ALTER TABLE public.point_transactions ADD CONSTRAINT point_transactions_category_check
  CHECK (category = ANY (ARRAY['questions','section_bonus','speed_session','badge','bank_completion','streak_daily']));

-- Seed milestone badges (idempotent on name)
INSERT INTO public.badges (name, description, rarity, point_value, icon_name, category, requirements) VALUES
  ('Spark', 'Reach a 3-day study streak', 'common', 30, 'Flame', 'streak', '[{"type":"streak","target":3,"label":"3-day streak"}]'::jsonb),
  ('Week Warrior', 'Reach a 7-day study streak', 'uncommon', 70, 'Flame', 'streak', '[{"type":"streak","target":7,"label":"7-day streak"}]'::jsonb),
  ('Double Digits', 'Reach a 10-day study streak', 'uncommon', 100, 'Flame', 'streak', '[{"type":"streak","target":10,"label":"10-day streak"}]'::jsonb),
  ('Fortnight Flame', 'Reach a 14-day study streak', 'rare', 140, 'Flame', 'streak', '[{"type":"streak","target":14,"label":"14-day streak"}]'::jsonb),
  ('Half Month Hero', 'Reach a 15-day study streak', 'rare', 150, 'Flame', 'streak', '[{"type":"streak","target":15,"label":"15-day streak"}]'::jsonb),
  ('Three Week Inferno', 'Reach a 21-day study streak', 'epic', 210, 'Flame', 'streak', '[{"type":"streak","target":21,"label":"21-day streak"}]'::jsonb)
ON CONFLICT (name) DO NOTHING;
