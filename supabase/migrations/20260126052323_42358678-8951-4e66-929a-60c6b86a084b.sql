-- Add sat_test_month column to students table
ALTER TABLE public.students 
ADD COLUMN sat_test_month text;

-- Add comment for documentation
COMMENT ON COLUMN public.students.sat_test_month IS 'Month when student plans to take SAT (march, may, june, august, sep, oct, nov, dec)';