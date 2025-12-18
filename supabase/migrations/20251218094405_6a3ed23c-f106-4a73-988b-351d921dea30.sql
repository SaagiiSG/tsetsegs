-- Change score column from integer to numeric(4,1) to support both SAT scores (0-800) and IELTS decimal band scores (0-9 with 0.5 increments)
ALTER TABLE public.practice_tests 
ALTER COLUMN score TYPE NUMERIC(4,1) USING score::NUMERIC(4,1);