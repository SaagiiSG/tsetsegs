-- Add group_number column to student_sprint_rankings
ALTER TABLE student_sprint_rankings 
ADD COLUMN group_number INTEGER DEFAULT 1;

-- Add composite index for efficient group queries
CREATE INDEX idx_sprint_rankings_tier_group 
ON student_sprint_rankings(sprint_id, current_tier, group_number);