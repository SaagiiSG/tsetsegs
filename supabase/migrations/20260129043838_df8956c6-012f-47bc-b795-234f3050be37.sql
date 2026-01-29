-- Add section_type, test_month, test_year, and variant columns to bluebook_tests
ALTER TABLE public.bluebook_tests
ADD COLUMN section_type TEXT DEFAULT 'full' CHECK (section_type IN ('full', 'math', 'english')),
ADD COLUMN test_month INTEGER CHECK (test_month >= 1 AND test_month <= 12),
ADD COLUMN test_year INTEGER CHECK (test_year >= 2024 AND test_year <= 2030),
ADD COLUMN variant TEXT;