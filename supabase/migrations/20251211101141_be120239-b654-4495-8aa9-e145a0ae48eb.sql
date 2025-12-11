-- Fix function search path for security
CREATE OR REPLACE FUNCTION public.link_student_account_by_phone()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find matching student by phone number (without country code formatting)
  SELECT id INTO NEW.linked_student_id
  FROM public.students
  WHERE phone = NEW.phone_number
     OR phone = REPLACE(NEW.phone_number, '-', '')
     OR REPLACE(phone, '-', '') = NEW.phone_number
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;