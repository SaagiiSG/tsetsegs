-- Drop the existing check constraint
ALTER TABLE public.student_sprint_rankings 
DROP CONSTRAINT IF EXISTS student_sprint_rankings_current_tier_check;

-- Add updated check constraint that includes 'unranked'
ALTER TABLE public.student_sprint_rankings 
ADD CONSTRAINT student_sprint_rankings_current_tier_check 
CHECK (current_tier = ANY (ARRAY['unranked'::text, 'bronze'::text, 'silver'::text, 'gold'::text, 'platinum'::text, 'diamond'::text, 'ruby'::text]));

-- Enroll all existing active students into the current active sprint
INSERT INTO public.student_sprint_rankings (
  sprint_id,
  student_account_id,
  current_tier,
  total_points,
  is_top_1,
  reserved_next_tier
)
SELECT 
  s.id,
  sa.id,
  'unranked',
  0,
  false,
  NULL
FROM public.sprints s
CROSS JOIN public.student_accounts sa
WHERE s.is_active = true
  AND sa.is_active = true
ON CONFLICT (sprint_id, student_account_id) DO NOTHING;