-- Remove the restrictive test_number constraint (currently limits to 1-6)
-- Replace with a more permissive constraint allowing up to 20 tests
ALTER TABLE public.practice_tests DROP CONSTRAINT practice_tests_test_number_check;
ALTER TABLE public.practice_tests ADD CONSTRAINT practice_tests_test_number_check CHECK (test_number >= 1 AND test_number <= 20);