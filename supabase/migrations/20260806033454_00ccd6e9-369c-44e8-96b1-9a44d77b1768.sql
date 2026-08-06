DELETE FROM public.class_test_answers WHERE test_id IN (SELECT id FROM public.class_tests WHERE join_code = 'DRY001');
DELETE FROM public.class_test_participants WHERE test_id IN (SELECT id FROM public.class_tests WHERE join_code = 'DRY001');
DELETE FROM public.class_tests WHERE join_code = 'DRY001';