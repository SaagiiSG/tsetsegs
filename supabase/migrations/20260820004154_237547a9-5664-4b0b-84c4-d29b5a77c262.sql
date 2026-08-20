INSERT INTO public.students (name, first_name, last_name, phone, batch_id, grade, school_name, sat_test_month, parent_phone, unique_link_id)
SELECT 'Баярням Түмэндэмбэрэл', 'Баярням', 'Түмэндэмбэрэл', '99748711', '180345ea-7d8c-41ae-b4cf-fcb6384502ba', 12, '84-р сургууль', '2026-12', '88187441', gen_random_uuid()::text
WHERE NOT EXISTS (
  SELECT 1 FROM public.students WHERE phone = '99748711' AND batch_id = '180345ea-7d8c-41ae-b4cf-fcb6384502ba'
);