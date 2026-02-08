-- Fix the reserved_next_tier check constraint to include 'unranked'
ALTER TABLE student_sprint_rankings 
DROP CONSTRAINT IF EXISTS student_sprint_rankings_reserved_next_tier_check;

ALTER TABLE student_sprint_rankings 
ADD CONSTRAINT student_sprint_rankings_reserved_next_tier_check 
CHECK (reserved_next_tier = ANY (ARRAY['unranked'::text, 'bronze'::text, 'silver'::text, 'gold'::text, 'platinum'::text, 'diamond'::text, 'ruby'::text]));