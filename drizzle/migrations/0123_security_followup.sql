-- Follow-up to 0121/0122: three gaps the security check of 5e429016 found. Safe to run twice.
SET lock_timeout = '3s';

-- 1. A student can't point their account at another student. 0121 shows a main student the attendance and homework
--    of their linked record (request_student_roster_ids) and 0041 lets them edit that record, while the roster is
--    readable, so PATCHing linked_student_id to any id opened another student's data. 0024's guard, with
--    linked_student_id pinned on update and cleared on insert (auto_link_student_account fires after this trigger
--    and still links a new account by phone). Staff, the service role and definer functions aren't guarded.
CREATE OR REPLACE FUNCTION public.guard_student_account()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE guarded boolean := current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff();
BEGIN
  IF guarded THEN
    IF TG_OP = 'INSERT' THEN
      NEW.password_hash := NULL; NEW.password_set_at := NULL;
      NEW.registered_device_id := NULL; NEW.device_registered_at := NULL; NEW.device_fingerprint := NULL;
      NEW.is_blocked := false; NEW.blocked_reason := NULL; NEW.blocked_at := NULL;
      NEW.is_dev_account := false; NEW.auth_user_id := NULL; NEW.is_ghost := false;
      NEW.linked_student_id := NULL;
    ELSE
      NEW.password_hash := OLD.password_hash; NEW.password_set_at := OLD.password_set_at;
      NEW.registered_device_id := OLD.registered_device_id; NEW.device_registered_at := OLD.device_registered_at;
      NEW.device_fingerprint := OLD.device_fingerprint;
      NEW.is_blocked := OLD.is_blocked; NEW.blocked_reason := OLD.blocked_reason; NEW.blocked_at := OLD.blocked_at;
      NEW.is_dev_account := OLD.is_dev_account; NEW.auth_user_id := OLD.auth_user_id; NEW.is_ghost := OLD.is_ghost;
      NEW.phone_number := OLD.phone_number; NEW.is_active := OLD.is_active;
      NEW.share_token := OLD.share_token; NEW.share_token_created_at := OLD.share_token_created_at;
      NEW.last_login := OLD.last_login; NEW.rank_unlocked_at := OLD.rank_unlocked_at;
      NEW.linked_student_id := OLD.linked_student_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- 2. A game a teacher never finished (closed tab, or "New session") keeps a status other than 'finished' forever, so
--    0121's rule left its players, points and answers public for good. Players now see a game only in the day after
--    it was created, while it runs or for a day after it ends. Staff still see every game.
DROP POLICY IF EXISTS "Players see open games, staff see all" ON public.live_sessions;
CREATE POLICY "Players see open games, staff see all" ON public.live_sessions
  FOR SELECT TO anon, authenticated
  USING ((created_at > now() - interval '1 day' AND (status <> 'finished' OR finished_at > now() - interval '1 day'))
    OR (SELECT public.is_platform_staff()));

-- The scoreboard and answers rules (0121) read this, so they follow the same window.
CREATE OR REPLACE FUNCTION public.live_session_open(_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.live_sessions s WHERE s.id = _session
    AND s.created_at > now() - interval '1 day'
    AND (s.status <> 'finished' OR s.finished_at > now() - interval '1 day'));
$$;
REVOKE EXECUTE ON FUNCTION public.live_session_open(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_open(uuid) TO anon, authenticated, service_role;

-- The phone's question list (0116): running games only, and now only games from the last day.
CREATE OR REPLACE FUNCTION public.live_session_question_list(_join_code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question_text', q.question_text,
    'multiple_choice_options', q.multiple_choice_options, 'order_index', lq.order_index)
    ORDER BY lq.order_index), '[]'::jsonb)
  FROM live_sessions s
  JOIN live_session_questions lq ON lq.session_id = s.id
  JOIN questions q ON q.id = lq.question_id
  WHERE s.join_code = upper(_join_code) AND s.status <> 'finished' AND s.created_at > now() - interval '1 day';
$$;
REVOKE ALL ON FUNCTION public.live_session_question_list(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_question_list(text) TO anon, authenticated;

-- 3. Teachers make parent report links but had no rule to read them back (only admins could, through "Admins can
--    manage closing report tokens"), so a generated link never showed. Staff = admins and main teachers (0024).
DROP POLICY IF EXISTS "Staff read closing report tokens" ON public.closing_report_tokens;
CREATE POLICY "Staff read closing report tokens" ON public.closing_report_tokens
  FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_staff()));
