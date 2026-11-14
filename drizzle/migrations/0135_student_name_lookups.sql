-- Step 1 of 2 (13 Nov 2026, Saagii): the phone-number leak. Since 0039/0041 any signed-in main student can read
-- every row of student_accounts (phone, device ids, share token, SAT scores) and students (parent phone, school,
-- fee date). Only four student screens show other students: the leaderboard, friends, challenges and the profile
-- card. These lookups give them just what they display; 0136 then narrows both reads to the student's own rows.
-- Additive: the app that is live now keeps working. Safe to run twice.
SET lock_timeout = '3s';

-- Names for the leaderboard, friends and challenges. The full phone (the friends list shows it) only for an accepted
-- friend, or for someone who sent the caller a request: never back to the sender of a pending request, because
-- account ids are public on the leaderboard and anyone can send one (0079). Everyone else, the last 4 digits.
CREATE OR REPLACE FUNCTION public.student_display_names(_ids uuid[])
RETURNS TABLE(id uuid, first_name text, last_name text, phone_tail text, friend_phone text, is_ghost boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, s.first_name, s.last_name, right(a.phone_number, 4),
    CASE WHEN EXISTS (SELECT 1 FROM public.student_friendships f
      WHERE (f.requester_id = a.id AND f.addressee_id = me.id)
         OR (f.requester_id = me.id AND f.addressee_id = a.id AND f.status = 'accepted'))
    THEN a.phone_number END,
    a.is_ghost
  FROM (SELECT public.request_student_id() AS id) me
  JOIN public.student_accounts a ON a.id = ANY(_ids)
  LEFT JOIN LATERAL (
    SELECT st.first_name, st.last_name FROM public.students st
    WHERE st.id = a.linked_student_id OR st.phone IN (a.phone_number, replace(a.phone_number, '-', ''))
    ORDER BY (st.id = a.linked_student_id) IS TRUE DESC
    LIMIT 1
  ) s ON true
  WHERE (me.id IS NOT NULL OR (SELECT public.is_platform_staff())) AND cardinality(_ids) <= 300;
$$;
REVOKE ALL ON FUNCTION public.student_display_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_display_names(uuid[]) TO anon, authenticated;

-- The profile card a student opens from the leaderboard: name, join date, last login, and the SAT score the card shows.
CREATE OR REPLACE FUNCTION public.student_profile_card(_id uuid)
RETURNS TABLE(id uuid, first_name text, last_name text, phone_tail text, created_at timestamptz, last_login timestamptz,
  sat_math_score integer, sat_english_score integer, sat_total_score integer, sat_score_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT n.id, n.first_name, n.last_name, n.phone_tail, a.created_at::timestamptz, a.last_login,
         a.sat_math_score, a.sat_english_score, a.sat_total_score, a.sat_score_date
  FROM public.student_display_names(ARRAY[_id]) n
  JOIN public.student_accounts a ON a.id = n.id;
$$;
REVOKE ALL ON FUNCTION public.student_profile_card(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_profile_card(uuid) TO anon, authenticated;

-- Add Friend by phone number. Says only whether that number is an enrolled student, their course, their account id
-- (null until they sign in) and their cohort; signed-out visitors can already learn the first part at login.
CREATE OR REPLACE FUNCTION public.student_find_by_phone(_phone text)
RETURNS TABLE(student_id uuid, course_type text, account_id uuid, cohort text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, b.course_type::text, a.id, a.cohort
  FROM public.students s
  LEFT JOIN public.batches b ON b.id = s.batch_id
  LEFT JOIN public.student_accounts a ON a.phone_number = s.phone AND a.is_ghost = false
  WHERE s.phone IN (_phone, replace(_phone, '-', '')) AND s.is_ghost = false
    AND (SELECT public.request_student_id()) IS NOT NULL
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.student_find_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_find_by_phone(text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
