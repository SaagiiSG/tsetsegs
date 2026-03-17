
-- Fix the trigger to pick the most recently created student record
CREATE OR REPLACE FUNCTION public.link_student_account_by_phone()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Link to the most recently created student with matching phone
  SELECT id INTO NEW.linked_student_id
  FROM public.students
  WHERE phone = NEW.phone_number
     OR phone = REPLACE(NEW.phone_number, '-', '')
     OR REPLACE(phone, '-', '') = NEW.phone_number
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN NEW;
END;
$function$;

-- Re-link existing student_accounts that may have wrong linked_student_id
-- Pick the most recently created student for each account
UPDATE public.student_accounts sa
SET linked_student_id = sub.latest_student_id
FROM (
  SELECT sa2.id as account_id, (
    SELECT s.id 
    FROM public.students s 
    WHERE s.phone = sa2.phone_number 
       OR s.phone = REPLACE(sa2.phone_number, '-', '')
       OR REPLACE(s.phone, '-', '') = sa2.phone_number
    ORDER BY s.created_at DESC 
    LIMIT 1
  ) as latest_student_id
  FROM public.student_accounts sa2
) sub
WHERE sa.id = sub.account_id
AND sub.latest_student_id IS NOT NULL
AND (sa.linked_student_id IS NULL OR sa.linked_student_id != sub.latest_student_id);
