-- lovable-cron-fallback-reviewed: Closed browsers cannot end a demo, so a minute job deletes expired demo copies and their made-up logins; it is scheduled only while copies exist and unschedules itself once they are gone. Copies expire after 15 minutes.
-- Live demo, part 1 (Saagii, 30 Oct): every demo visitor gets a private copy of "Northside Academy", a sample center
-- built fresh by demo_build_center, and the real center portals run against it. Every date is relative to now(), and a
-- fixed seed makes every copy the same. The demo edge function (service role) is the only caller of everything here.
SET lock_timeout = '3s';

-- 1. One row per visitor's copy. Only the service role reads or writes it.
CREATE TABLE public.demo_copies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.institution_customers(id),
  visitor text NOT NULL,
  ip text NOT NULL,
  end_token_hash text NOT NULL,
  user_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes'
);
REVOKE ALL ON public.demo_copies FROM anon, authenticated;
GRANT ALL ON public.demo_copies TO service_role;
ALTER TABLE public.demo_copies ENABLE ROW LEVEL SECURITY;

-- One row per start, kept when the copy is dropped, so a start-then-end loop still counts toward the hourly limits.
-- Each start and each cleanup prunes rows older than a day. Only the service role reads or writes it.
CREATE TABLE public.demo_starts (visitor text NOT NULL, ip text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX demo_starts_created_at_idx ON public.demo_starts (created_at);
REVOKE ALL ON public.demo_starts FROM anon, authenticated;
GRANT ALL ON public.demo_starts TO service_role;
ALTER TABLE public.demo_starts ENABLE ROW LEVEL SECURITY;

-- 2. The sample center: 3 staff, 3 classes, 24 students and two months of practice, attendance and sprints.
-- Students who must look a certain way are built to: Maya Chen (streak 23, Gold, 440+ distinct math questions, rings
-- part-closed today), Noah Kim (under 50% accuracy) and Ava Johnson (nothing in 9 days) are the only two in Fall Cohort A
-- that "Needs attention" flags (CenterTeacherPortal.tsx riskOf). Everyone else answers within 3 days, at 55% or better,
-- and misses at most 2 classes.
CREATE FUNCTION public.demo_build_center(_institution uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  t0 timestamptz := now();
  today date := current_date;
  tiers text[] := ARRAY['unranked','bronze','silver','gold','platinum','diamond','ruby'];
  admin_m uuid; rivera uuid; okafor uuid; cls_a uuid; cls_b uuid; cls_s uuid; maya uuid;
  pool integer; carrier uuid; sp record;
BEGIN
  IF NOT public.is_demo_center(_institution) THEN RAISE EXCEPTION 'Not a demo center'; END IF;
  PERFORM setseed(0.42);
  -- The seed stays with this pooled connection, so it is replaced from a strong source when the build ends, failed or
  -- not, for whatever runs on the connection next. This block runs to the matching EXCEPTION below.
  BEGIN

  -- tenant_members.user_id is NOT NULL (0002) with no link to auth.users: a random stand-in until demo_attach_logins.
  INSERT INTO tenant_members (institution_id, user_id, role, display_name, email, created_at)
  VALUES (_institution, gen_random_uuid(), 'center_admin', 'Daniel Brooks', 'daniel.brooks@demo.flowersos.co', t0 - interval '120 days')
  RETURNING id INTO admin_m;
  INSERT INTO tenant_members (institution_id, user_id, role, display_name, email, created_at)
  VALUES (_institution, gen_random_uuid(), 'teacher', 'Ms. Rivera', 'elena.rivera@demo.flowersos.co', t0 - interval '100 days')
  RETURNING id INTO rivera;
  INSERT INTO tenant_members (institution_id, user_id, role, display_name, email, created_at)
  VALUES (_institution, gen_random_uuid(), 'teacher', 'James Okafor', 'james.okafor@demo.flowersos.co', t0 - interval '40 days')
  RETURNING id INTO okafor;

  -- starts_on stays within 120 days, or the teacher portal files the class under "previous".
  INSERT INTO tenant_classes (institution_id, name, teacher_member_id, schedule, starts_on, created_at)
  VALUES (_institution, 'Fall Cohort A', rivera, 'Mon/Wed 5-7pm', today - 60, t0 - interval '62 days') RETURNING id INTO cls_a;
  INSERT INTO tenant_classes (institution_id, name, teacher_member_id, schedule, starts_on, created_at)
  VALUES (_institution, 'Fall Cohort B', rivera, 'Tue/Thu 4-6pm', today - 45, t0 - interval '47 days') RETURNING id INTO cls_b;
  INSERT INTO tenant_classes (institution_id, name, teacher_member_id, schedule, starts_on, created_at)
  VALUES (_institution, 'Spring Intensive', okafor, 'Sat 10am-1pm', today - 20, t0 - interval '22 days') RETURNING id INTO cls_s;

  -- n answers at accuracy acc; first_day / last_day = days ago of the first and last practice.
  CREATE TEMP TABLE demo_roster ON COMMIT DROP AS
  SELECT gen_random_uuid() AS id, v.*,
    CASE v.cls WHEN 'A' THEN cls_a WHEN 'B' THEN cls_b ELSE cls_s END AS class_id,
    CASE v.cls WHEN 'A' THEN 58 WHEN 'B' THEN 44 ELSE 19 END AS first_day
  FROM (VALUES
    (0, 'Maya Chen', 'A', 600, 0.82, 0, NULL), (1, 'Ethan Park', 'A', 340, 0.80, 0, 760), (2, 'Sofia Alvarez', 'A', 310, 0.78, 0, 740),
    (3, 'Liam Patel', 'A', 180, 0.66, 1, NULL), (4, 'Zara Ahmed', 'A', 220, 0.72, 0, NULL), (5, 'Lucas Silva', 'A', 120, 0.61, 2, NULL),
    (6, 'Noah Kim', 'A', 30, 0.45, 2, NULL), (7, 'Ava Johnson', 'A', 90, 0.63, 10, NULL), (8, 'Hana Suzuki', 'A', 150, 0.70, 1, NULL),
    (9, 'Omar Haddad', 'A', 95, 0.58, 3, NULL),
    (10, 'Chloe Martin', 'B', 280, 0.77, 0, 700), (11, 'Arjun Mehta', 'B', 250, 0.74, 1, NULL), (12, 'Emma Novak', 'B', 160, 0.69, 0, NULL),
    (13, 'Diego Torres', 'B', 110, 0.60, 2, NULL), (14, 'Mei Lin', 'B', 200, 0.75, 0, NULL), (15, 'Jacob Wright', 'B', 70, 0.56, 3, NULL),
    (16, 'Amara Okeke', 'B', 130, 0.67, 1, NULL), (17, 'Felix Meyer', 'B', 60, 0.59, 2, NULL),
    (18, 'Isabella Rossi', 'S', 90, 0.68, 0, NULL), (19, 'Kenji Watanabe', 'S', 120, 0.72, 1, NULL), (20, 'Nadia Rahman', 'S', 70, 0.62, 2, NULL),
    (21, 'Samuel Green', 'S', 50, 0.57, 1, NULL), (22, 'Leila Farah', 'S', 80, 0.65, 0, NULL), (23, 'Tom Becker', 'S', 40, 0.55, 3, NULL)
  ) v(ord, name, cls, n, acc, last_day, sat);
  SELECT id INTO maya FROM pg_temp.demo_roster WHERE ord = 0;

  INSERT INTO tenant_students (id, institution_id, class_id, name, phone, onboarding_eligible, sat_month, real_sat_math, real_sat_date, created_at)
  SELECT r.id, _institution, r.class_id, r.name, (5550100 + r.ord)::text, false, to_char(t0 + interval '2 months', 'YYYY-MM'),
    r.sat, CASE WHEN r.sat IS NOT NULL THEN today - 40 END, t0 - (r.first_day + 2) * interval '1 day'
  FROM pg_temp.demo_roster r;

  -- Questions to answer: International math variants with an answer key and a topic. Ordered by id first, so the
  -- seeded shuffle is the same in every copy.
  CREATE TEMP TABLE demo_pool ON COMMIT DROP AS
  SELECT x.id, x.answer, x.alternate_answers, x.diff,
    row_number() OVER (ORDER BY x.r) AS pos, row_number() OVER (PARTITION BY x.diff ORDER BY x.r) AS dpos
  FROM (SELECT q.*, random() AS r FROM (
    SELECT id, answer, alternate_answers, lower(difficulty_level) AS diff FROM intl_questions
    WHERE is_active AND ext_variant AND NOT hide_from_practice AND lower(subject) = 'math' AND category_id IS NOT NULL
      AND btrim(coalesce(answer, '')) <> '' AND lower(difficulty_level) IN ('easy', 'medium', 'hard')
    ORDER BY id) q) x;
  SELECT count(*) INTO pool FROM pg_temp.demo_pool;
  IF pool < 700 THEN RAISE EXCEPTION 'demo: only % International math questions to build a sample history from', pool; END IF;
  SELECT id INTO carrier FROM pg_temp.demo_pool WHERE pos = 1;

  -- Every student answers each question once, so the attempt trigger's rule pays 10 per correct answer. Rows go in in
  -- an order that never depends on the random ids, so r1-r3 (drawn as they go in) are the same in every copy.
  CREATE TEMP TABLE demo_plan (id uuid NOT NULL DEFAULT gen_random_uuid(), student_id uuid NOT NULL, question_id uuid NOT NULL,
    ok boolean NOT NULL, day integer NOT NULL, r1 float8 NOT NULL DEFAULT random(), r2 float8 NOT NULL DEFAULT random(),
    r3 float8 NOT NULL DEFAULT random(), answer text, is_correct boolean, created_at timestamptz, secs integer) ON COMMIT DROP;
  -- Maya today: 8 hard, 15 medium and 7 easy; 7 hard and 14 medium correct (rings 7/10 and 14/19).
  INSERT INTO pg_temp.demo_plan (student_id, question_id, ok, day)
  SELECT maya, p.id, p.dpos <= CASE p.diff WHEN 'hard' THEN 7 WHEN 'medium' THEN 14 ELSE 6 END, 0
  FROM pg_temp.demo_pool p WHERE p.dpos <= CASE p.diff WHEN 'hard' THEN 8 WHEN 'medium' THEN 15 ELSE 7 END;
  -- Maya before today: 570 more, 465 correct (82% overall), on every day from 1 to 22 days ago, then nothing 23 and 24
  -- days ago: two missed days in a row, which a freezer can't bridge, so the streak is exactly 23. Single days off before
  -- that don't matter.
  INSERT INTO pg_temp.demo_plan (student_id, question_id, ok, day)
  SELECT maya, x.id, row_number() OVER (ORDER BY random()) <= 465,
    dd.days[CASE WHEN x.k <= 52 THEN x.k ELSE 1 + floor(random() * 52)::int END]
  FROM (SELECT p.id, row_number() OVER (ORDER BY p.pos) AS k FROM pg_temp.demo_pool p
        WHERE p.dpos > CASE p.diff WHEN 'hard' THEN 8 WHEN 'medium' THEN 15 ELSE 7 END) x,
       (SELECT array_agg(d ORDER BY d) AS days FROM generate_series(1, 59) d WHERE d NOT IN (23, 24, 30, 37, 44, 51, 58)) dd
  WHERE x.k <= 570;
  -- Everyone else: exactly round(n * acc) correct; the first answer falls on last_day, the rest anywhere since joining.
  INSERT INTO pg_temp.demo_plan (student_id, question_id, ok, day)
  SELECT x.id, p.id, x.rk <= round(x.n * x.acc), x.day
  FROM (SELECT r.id, r.ord, r.n, r.acc, k,
          row_number() OVER (PARTITION BY r.ord ORDER BY random()) AS rk,
          CASE WHEN k = 1 THEN r.last_day ELSE r.last_day + floor(random() * (r.first_day - r.last_day + 1))::int END AS day
        FROM pg_temp.demo_roster r CROSS JOIN LATERAL generate_series(1, r.n) k WHERE r.ord > 0) x
  JOIN pg_temp.demo_pool p ON p.pos = (x.ord * 211 + x.k) % pool + 1;
  -- Wrong answers are another choice letter, or a number the fill-in check rejects. All in the same 40 minutes of the
  -- day before now, so every answer lands on the intended local day in any time zone (except just after midnight).
  UPDATE pg_temp.demo_plan pl SET
    answer = CASE WHEN pl.ok THEN p.answer
      WHEN upper(btrim(p.answer)) ~ '^[A-D]$' THEN chr(65 + (ascii(upper(btrim(p.answer))) - 65 + 1 + floor(pl.r1 * 3)::int) % 4)
      WHEN NOT public.fill_answer_matches(w.v, p.answer, p.alternate_answers) THEN w.v ELSE '-999' END,
    created_at = t0 - pl.day * interval '1 day' - pl.r2 * interval '40 minutes',
    secs = 25 + floor(pl.r3 * 90)::int + CASE p.diff WHEN 'hard' THEN 60 WHEN 'medium' THEN 30 ELSE 0 END
  FROM pg_temp.demo_pool p CROSS JOIN LATERAL (SELECT coalesce(trim_scale(round(public.fill_value(p.answer) + 1, 2))::text, '0') AS v) w
  WHERE p.id = pl.question_id;
  -- Graded the way guard_tenant_attempt grades.
  UPDATE pg_temp.demo_plan pl SET is_correct = upper(btrim(pl.answer)) = upper(btrim(p.answer)) OR public.fill_answer_matches(pl.answer, p.answer, p.alternate_answers)
  FROM pg_temp.demo_pool p WHERE p.id = pl.question_id;

  -- guard_tenant_attempt forces created_at to now() and takes an advisory lock per student and question until commit;
  -- thousands of distinct locks could fill the server's shared lock table. So every row goes in on one carrier question
  -- (one lock per student), then gets its real question, time and grade. No trigger runs on UPDATE.
  INSERT INTO tenant_attempts (id, institution_id, student_id, question_id, answer, time_spent_seconds)
  SELECT pl.id, _institution, pl.student_id, carrier, pl.answer, pl.secs FROM pg_temp.demo_plan pl ORDER BY pl.created_at;
  UPDATE tenant_attempts a SET question_id = pl.question_id, created_at = pl.created_at, is_correct = pl.is_correct,
    points = CASE WHEN pl.is_correct THEN 10 ELSE 0 END
  FROM pg_temp.demo_plan pl WHERE a.id = pl.id;

  -- Speed runs: Maya 3 today and 20 earlier in her streak; others one per 70 answers. guard_tenant_speed_run forces
  -- created_at and caps the scores, so they are set afterwards.
  CREATE TEMP TABLE demo_runs ON COMMIT DROP AS
  SELECT gen_random_uuid() AS id, x.sid, x.day, x.total, least(x.total, round(x.total * (x.acc + random() * 0.15))::int) AS correct,
    random() AS frac
  FROM (SELECT r.id AS sid, r.acc, 8 + floor(random() * 7)::int AS total,
          CASE WHEN r.ord > 0 THEN r.last_day + floor(random() * (r.first_day - r.last_day + 1))::int
               WHEN k <= 3 THEN 0 ELSE 1 + floor(random() * 22)::int END AS day
        FROM pg_temp.demo_roster r CROSS JOIN LATERAL generate_series(1, CASE WHEN r.ord = 0 THEN 23 ELSE r.n / 70 END) k) x;
  INSERT INTO tenant_speed_runs (id, student_id, institution_id, subject, duration_seconds, total_time_seconds)
  SELECT x.id, x.sid, _institution, 'math', 120, 120 FROM pg_temp.demo_runs x;
  UPDATE tenant_speed_runs r SET created_at = t0 - x.day * interval '1 day' - x.frac * interval '40 minutes', total = x.total, correct = x.correct
  FROM pg_temp.demo_runs x WHERE r.id = x.id;

  INSERT INTO tenant_student_goals (student_id, institution_id, speed, hard, medium, set_at)
  SELECT r.id, _institution, CASE WHEN r.ord = 0 THEN 4 ELSE 2 END, CASE WHEN r.ord = 0 THEN 10 ELSE 5 END,
    CASE WHEN r.ord = 0 THEN 19 ELSE 10 END, t0 - r.first_day * interval '1 day'
  FROM pg_temp.demo_roster r;

  -- Every class day in the last 8 weeks up to 2 days ago (so no time zone sees a row for today, and "Mark" shows):
  -- about 88% present, 7% late, 5% absent; at most 2 absences each, none in the 3-session Spring Intensive.
  INSERT INTO tenant_attendance (institution_id, class_id, student_id, session_date, status)
  SELECT _institution, y.class_id, y.sid, y.d,
    CASE WHEN y.s = 'absent' AND (y.cls = 'S' OR count(*) FILTER (WHERE y.s = 'absent') OVER (PARTITION BY y.sid ORDER BY y.d) > 2) THEN 'present' ELSE y.s END
  FROM (SELECT z.*, CASE WHEN z.q < 0.05 THEN 'absent' WHEN z.q < 0.12 THEN 'late' ELSE 'present' END AS s
        FROM (SELECT r.id AS sid, r.class_id, r.cls, today - b AS d, random() AS q
              FROM pg_temp.demo_roster r CROSS JOIN LATERAL generate_series(2, CASE r.cls WHEN 'A' THEN 56 WHEN 'B' THEN 45 ELSE 20 END) b
              WHERE extract(isodow FROM today - b) = ANY (CASE r.cls WHEN 'A' THEN ARRAY[1, 3] WHEN 'B' THEN ARRAY[2, 4] ELSE ARRAY[6] END)
              ORDER BY r.ord, b) z) y;

  -- Past sprints go in already finished: finishing one by UPDATE fires tenant_sprint_rank_snapshot, which calls
  -- tenant_student_board, which refuses a caller with no login. Their ranks are written below instead.
  INSERT INTO tenant_sprints (institution_id, name, starts_on, ends_on, status, created_at) VALUES
    (_institution, 'Sprint 1', today - 35, today - 22, 'finished', t0 - interval '35 days'),
    (_institution, 'Sprint 2', today - 21, today - 8, 'finished', t0 - interval '21 days'),
    (_institution, 'Sprint 3', today - 7, today + 7, 'active', t0 - interval '7 days');
  -- The snapshot's own scoring and promotion rule (0013, 0031), from a starting tier of bronze: Maya, first both times,
  -- goes bronze to silver to gold.
  FOR sp IN SELECT * FROM tenant_sprints WHERE institution_id = _institution AND status = 'finished' ORDER BY starts_on LOOP
    INSERT INTO tenant_rank_history (institution_id, sprint_id, student_id, tier, next_tier, final_position, points, created_at)
    SELECT _institution, sp.id, b.id, b.tier,
      CASE WHEN b.pts = 0 THEN tiers[greatest(1, b.idx - 1)]
           WHEN b.tp <= CASE b.tier WHEN 'unranked' THEN 20 WHEN 'bronze' THEN 20 WHEN 'silver' THEN 15 WHEN 'gold' THEN 10 WHEN 'platinum' THEN 5 ELSE 1 END
           THEN tiers[least(7, b.idx + 1)] ELSE tiers[greatest(1, b.idx - 1)] END,
      b.standing, b.pts, (sp.ends_on + 1)::timestamptz
    FROM (SELECT s.*, array_position(tiers, s.tier) AS idx,
            row_number() OVER (ORDER BY s.pts DESC, s.n DESC, s.name, s.id) AS standing,
            row_number() OVER (PARTITION BY s.tier ORDER BY s.pts DESC, s.n DESC, s.name, s.id) AS tp
          FROM (SELECT st.id, st.name,
                  coalesce((SELECT h.next_tier FROM tenant_rank_history h WHERE h.student_id = st.id ORDER BY h.created_at DESC LIMIT 1), 'bronze') AS tier,
                  coalesce((SELECT sum(a.points) FROM tenant_attempts a WHERE a.student_id = st.id AND a.created_at >= sp.starts_on::timestamptz AND a.created_at < (sp.ends_on + 1)::timestamptz), 0)
                  + coalesce((SELECT sum(r.correct) * 10 FROM tenant_speed_runs r WHERE r.student_id = st.id AND r.created_at >= sp.starts_on::timestamptz AND r.created_at < (sp.ends_on + 1)::timestamptz), 0) AS pts,
                  (SELECT count(*) FROM tenant_attempts a WHERE a.student_id = st.id AND a.created_at >= sp.starts_on::timestamptz AND a.created_at < (sp.ends_on + 1)::timestamptz)
                  + coalesce((SELECT sum(r.total) FROM tenant_speed_runs r WHERE r.student_id = st.id AND r.created_at >= sp.starts_on::timestamptz AND r.created_at < (sp.ends_on + 1)::timestamptz), 0) AS n
                FROM tenant_students st WHERE st.institution_id = _institution AND st.created_at < (sp.ends_on + 1)::timestamptz) s) b;
  END LOOP;

  INSERT INTO tenant_video_progress (student_id, institution_id, video_id, completed_at)
  SELECT maya, _institution, v.id, t0 - interval '5 days'
  FROM concept_videos v JOIN demo_slice d ON d.item_id = v.id AND d.kind = 'video'
  ORDER BY v.order_index, v.id LIMIT 2;

  -- Every badge already earned counts as celebrated, so no pop-ups (CenterBadgeWatcher; rules in centerProfile.ts).
  INSERT INTO tenant_badge_celebrations (student_id, institution_id, badge_key, celebrated_at)
  SELECT s.id, _institution, b.key, t0 - interval '1 day'
  FROM (SELECT r.id,
          (SELECT count(*) FROM pg_temp.demo_plan p WHERE p.student_id = r.id) AS n,
          (SELECT count(*) FROM pg_temp.demo_plan p WHERE p.student_id = r.id AND p.is_correct) AS c,
          (SELECT count(*) FROM tenant_attendance a WHERE a.student_id = r.id AND a.status IN ('present', 'late')) AS present
        FROM pg_temp.demo_roster r) s
  CROSS JOIN LATERAL (VALUES ('first_steps', s.n >= 10), ('centurion', s.n >= 100), ('marathon', s.n >= 500),
    ('sharpshooter', s.n >= 50 AND s.c >= 0.8 * s.n), ('regular', s.present >= 10)) b(key, got)
  WHERE b.got
  UNION ALL
  -- master_<set>: every slice math question of that practice set solved (practiceSets.ts; demo users see only the slice).
  SELECT r.id, _institution, 'master_' || m.key, t0 - interval '1 day'
  FROM pg_temp.demo_roster r CROSS JOIN (VALUES ('68'), ('SATMathTraining800'), ('CB')) m(key)
  JOIN demo_slice d ON d.kind = 'question'
  JOIN intl_questions q ON q.id = d.item_id AND q.is_active AND NOT q.hide_from_practice AND lower(coalesce(q.subject, 'math')) = 'math'
    AND CASE m.key WHEN 'CB' THEN coalesce(q.question_set, '') NOT IN ('68', 'SATMathTraining800') ELSE q.question_set = m.key END
  GROUP BY r.id, m.key
  HAVING bool_and(EXISTS (SELECT 1 FROM pg_temp.demo_plan p WHERE p.student_id = r.id AND p.question_id = q.id AND p.is_correct));

  INSERT INTO tenant_announcements (institution_id, class_id, title, body, created_at) VALUES
    (_institution, NULL, 'SAT test day checklist',
     'Bring your admission ticket, a photo ID, a charged laptop or tablet with Bluebook installed, your calculator and a snack. Plan to arrive 30 minutes early.',
     t0 - interval '3 days'),
    (_institution, cls_a, 'Bring your calculator Wednesday',
     'We are doing a timed Desmos drill in class on Wednesday. Bring a charged calculator or laptop.', t0 - interval '1 day');

  INSERT INTO tenant_registrations (institution_id, class_id, name, phone, school, grade, created_at) VALUES
    (_institution, cls_s, 'Grace Liu', '5550190', 'Northside High School', '11', t0 - interval '2 days'),
    (_institution, cls_b, 'Ryan Cooper', '5550191', 'Lakeview High School', '12', t0 - interval '1 day');

  -- No institution_payment_dues and no educator_demo_requests: tenant_has_role refuses a center with an open request.
  EXCEPTION WHEN OTHERS THEN
    PERFORM setseed(('x' || substr(md5(gen_random_uuid()::text), 1, 8))::bit(32)::int / 2147483648.0);
    RAISE;
  END;
  PERFORM setseed(('x' || substr(md5(gen_random_uuid()::text), 1, 8))::bit(32)::int / 2147483648.0);
  RETURN jsonb_build_object('admin_member_id', admin_m, 'teacher_member_id', rivera, 'student_id', maya);
END $$;
REVOKE ALL ON FUNCTION public.demo_build_center(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_build_center(uuid) TO service_role;

-- 3. Copy bookkeeping, called by the demo edge function.
-- Limits: 100 unexpired copies at once (demo_busy); 5 starts per visitor or 40 per network address in the last hour,
-- counted from demo_starts (demo_limit).
-- The lock is held through the whole build, so a start waits at most 3 s for the one before it, then fails with
-- SQLSTATE 55P03 (the edge function answers demo_busy) instead of holding a shared API connection.
CREATE FUNCTION public.demo_create(_visitor text, _ip text, _end_token_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET lock_timeout = '3s' AS $$
DECLARE inst uuid; new_slug text := 'demo-' || substr(md5(gen_random_uuid()::text), 1, 12); built jsonb; cp public.demo_copies;
BEGIN
  PERFORM pg_advisory_xact_lock(7715402);
  DELETE FROM demo_starts WHERE created_at < now() - interval '1 day'; -- also here: the cleanup job sleeps when no copies are left
  IF (SELECT count(*) FROM demo_copies WHERE expires_at > now()) >= 100 THEN RAISE EXCEPTION 'demo_busy'; END IF;
  IF (SELECT count(*) FROM demo_starts WHERE visitor = _visitor AND created_at > now() - interval '1 hour') >= 5
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

-- The three made-up logins become Daniel Brooks, Ms. Rivera and Maya Chen; their ids are what cleanup may delete.
CREATE FUNCTION public.demo_attach_logins(_copy uuid, _admin uuid, _teacher uuid, _student uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inst uuid;
BEGIN
  SELECT c.institution_id INTO inst FROM demo_copies c JOIN institution_customers i ON i.id = c.institution_id AND i.is_demo WHERE c.id = _copy;
  IF inst IS NULL THEN RAISE EXCEPTION 'Unknown demo copy'; END IF;
  UPDATE tenant_members SET user_id = _admin WHERE institution_id = inst AND email = 'daniel.brooks@demo.flowersos.co';
  UPDATE tenant_members SET user_id = _teacher WHERE institution_id = inst AND email = 'elena.rivera@demo.flowersos.co';
  UPDATE tenant_students SET user_id = _student WHERE institution_id = inst AND phone = '5550100';
  UPDATE demo_copies SET user_ids = ARRAY[_admin, _teacher, _student] WHERE id = _copy;
END $$;
REVOKE ALL ON FUNCTION public.demo_attach_logins(uuid, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_attach_logins(uuid, uuid, uuid, uuid) TO service_role;

-- "End demo": the logins to delete, only for the page holding the end token.
CREATE FUNCTION public.demo_end_users(_copy uuid, _end_token_hash text) RETURNS uuid[]
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ids uuid[];
BEGIN
  SELECT user_ids INTO ids FROM demo_copies WHERE id = _copy AND end_token_hash = _end_token_hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not allowed'; END IF;
  RETURN ids;
END $$;
REVOKE ALL ON FUNCTION public.demo_end_users(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_end_users(uuid, text) TO service_role;

CREATE FUNCTION public.demo_expired() RETURNS TABLE(copy_id uuid, user_ids uuid[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.user_ids FROM public.demo_copies c WHERE c.expires_at <= now() ORDER BY c.expires_at;
$$;
REVOKE ALL ON FUNCTION public.demo_expired() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_expired() TO service_role;

-- Deletes a copy's center row by row (several tables have no cascade from the center). Only a demo center is ever
-- touched; a second call finds no copy and does nothing. demo_starts is never touched here.
CREATE FUNCTION public.demo_drop(_copy uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inst uuid;
BEGIN
  SELECT c.institution_id INTO inst FROM demo_copies c JOIN institution_customers i ON i.id = c.institution_id AND i.is_demo WHERE c.id = _copy;
  IF inst IS NOT NULL THEN
    DELETE FROM tenant_rank_history WHERE institution_id = inst;
    DELETE FROM tenant_announcement_reads WHERE institution_id = inst;
    DELETE FROM tenant_announcements WHERE institution_id = inst;
    DELETE FROM tenant_live_answers WHERE institution_id = inst;
    DELETE FROM tenant_live_sessions WHERE institution_id = inst;
    DELETE FROM tenant_badge_celebrations WHERE institution_id = inst;
    DELETE FROM tenant_test_attempts WHERE institution_id = inst;
    -- After the attempts: dropping a session first would null their session_id and could collide with tenant_test_open_idx.
    DELETE FROM tenant_proctor_sessions WHERE institution_id = inst;
    DELETE FROM tenant_sat_predictions WHERE institution_id = inst;
    DELETE FROM tenant_video_progress WHERE institution_id = inst;
    DELETE FROM tenant_student_goals WHERE institution_id = inst;
    DELETE FROM tenant_speed_runs WHERE institution_id = inst;
    DELETE FROM tenant_attempts WHERE institution_id = inst;
    DELETE FROM tenant_attendance WHERE institution_id = inst;
    DELETE FROM tenant_homework WHERE institution_id = inst;
    DELETE FROM tenant_student_notes WHERE institution_id = inst;
    DELETE FROM tenant_registrations WHERE institution_id = inst;
    DELETE FROM tenant_students WHERE institution_id = inst;
    DELETE FROM tenant_classes WHERE institution_id = inst;
    DELETE FROM tenant_sprints WHERE institution_id = inst;
    DELETE FROM tenant_members WHERE institution_id = inst;
  END IF;
  DELETE FROM demo_copies WHERE id = _copy;
  DELETE FROM institution_customers WHERE id = inst AND is_demo;
END $$;
REVOKE ALL ON FUNCTION public.demo_drop(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_drop(uuid) TO service_role;

-- The cleanup job stops itself once no copies are left (as 0016 does). Same lock as demo_create, so a copy made
-- meanwhile keeps its job; like demo_create it waits at most 3 s, so calling the public cleanup over and over can't
-- hold up starts. It also prunes start-log rows older than a day.
CREATE FUNCTION public.demo_cleanup_finish() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public SET lock_timeout = '3s' AS $$
DECLARE j bigint;
BEGIN
  PERFORM pg_advisory_xact_lock(7715402);
  DELETE FROM demo_starts WHERE created_at < now() - interval '1 day';
  IF NOT EXISTS (SELECT 1 FROM demo_copies) THEN
    FOR j IN SELECT jobid FROM cron.job WHERE jobname = 'demo-cleanup' LOOP PERFORM cron.unschedule(j); END LOOP;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.demo_cleanup_finish() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_cleanup_finish() TO service_role;

NOTIFY pgrst, 'reload schema';
