-- Live demo fixes after the 6 Nov AI test (Saagii, 6 Nov 2026).
-- 1. 30 demo starts per visitor (browser) per hour, up from 5: a presenter's laptop no longer locks after 5 restarts.
--    The 40 per network address and 100 copies at once stay as in 0109.
-- 2. Five questions from the 68 set join the demo slice. Practice and "Start practicing" open on the 68 tab, which
--    had none in the demo ("No questions match these filters"). The 68 set has no written explanations yet.

-- Same as 0109 except the 5 -> 30.
CREATE OR REPLACE FUNCTION public.demo_create(_visitor text, _ip text, _end_token_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET lock_timeout = '3s' AS $$
DECLARE inst uuid; new_slug text := 'demo-' || substr(md5(gen_random_uuid()::text), 1, 12); built jsonb; cp public.demo_copies;
BEGIN
  PERFORM pg_advisory_xact_lock(7715402);
  DELETE FROM demo_starts WHERE created_at < now() - interval '1 day'; -- also here: the cleanup job sleeps when no copies are left
  IF (SELECT count(*) FROM demo_copies WHERE expires_at > now()) >= 100 THEN RAISE EXCEPTION 'demo_busy'; END IF;
  IF (SELECT count(*) FROM demo_starts WHERE visitor = _visitor AND created_at > now() - interval '1 hour') >= 30
     OR (SELECT count(*) FROM demo_starts WHERE ip = _ip AND created_at > now() - interval '1 hour') >= 40 THEN
    RAISE EXCEPTION 'demo_limit';
  END IF;
  INSERT INTO demo_starts (visitor, ip) VALUES (_visitor, _ip);
  INSERT INTO institution_customers (name, country, status, portal_enabled, is_demo, slug)
  VALUES ('Northside Academy', 'United States', 'active', true, true, new_slug) RETURNING id INTO inst;
  built := public.demo_build_center(inst);
  INSERT INTO demo_copies (institution_id, visitor, ip, end_token_hash) VALUES (inst, _visitor, _ip, _end_token_hash) RETURNING * INTO cp;
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'demo-cleanup') THEN
    PERFORM cron.schedule('demo-cleanup', '* * * * *', $job$select public._post_edge_function('demo', '{"action":"cleanup"}'::jsonb)$job$);
  END IF;
  RETURN built || jsonb_build_object('copy_id', cp.id, 'institution_id', inst, 'slug', new_slug, 'expires_at', cp.expires_at);
END $$;
REVOKE ALL ON FUNCTION public.demo_create(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_create(text, text, text) TO service_role;

INSERT INTO public.demo_slice (item_id, kind)
SELECT id, 'question' FROM public.intl_questions
WHERE is_active AND NOT hide_from_practice AND question_set = '68' AND lower(coalesce(subject, 'math')) = 'math'
  AND id NOT IN (SELECT item_id FROM public.demo_slice)
ORDER BY question_id, id
-- Up to 5 in all, so running this again adds nothing.
LIMIT greatest(0, 5 - (SELECT count(*) FROM public.demo_slice d JOIN public.intl_questions q ON q.id = d.item_id
                       WHERE d.kind = 'question' AND q.question_set = '68' AND q.is_active AND NOT q.hide_from_practice));
