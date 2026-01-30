-- Fix foreign key constraint to allow cascade delete of bluebook tests
ALTER TABLE public.bluebook_attempts 
  DROP CONSTRAINT bluebook_attempts_test_id_fkey;

ALTER TABLE public.bluebook_attempts 
  ADD CONSTRAINT bluebook_attempts_test_id_fkey 
  FOREIGN KEY (test_id) REFERENCES public.bluebook_tests(id) ON DELETE CASCADE;

-- Also fix bluebook_answers to cascade on module deletion
ALTER TABLE public.bluebook_answers
  DROP CONSTRAINT bluebook_answers_module_id_fkey;

ALTER TABLE public.bluebook_answers
  ADD CONSTRAINT bluebook_answers_module_id_fkey
  FOREIGN KEY (module_id) REFERENCES public.bluebook_modules(id) ON DELETE CASCADE;

-- Fix bluebook_attempts current_module_id to allow setting to null on module deletion
ALTER TABLE public.bluebook_attempts
  DROP CONSTRAINT bluebook_attempts_current_module_id_fkey;

ALTER TABLE public.bluebook_attempts
  ADD CONSTRAINT bluebook_attempts_current_module_id_fkey
  FOREIGN KEY (current_module_id) REFERENCES public.bluebook_modules(id) ON DELETE SET NULL;