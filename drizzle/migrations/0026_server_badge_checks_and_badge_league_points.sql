
-- Server decides whether a student has really earned a badge.
CREATE OR REPLACE FUNCTION public.student_badge_earned(p_student uuid, p_badge uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; req jsonb; target int; best int;
BEGIN
  SELECT category, requirements INTO b FROM public.badges WHERE id = p_badge;
  IF NOT FOUND THEN RETURN false; END IF;
  -- Only streak badges can be unlocked from the student app; all others
  -- (championship, legendary, seasonal, challenges) are awarded by server jobs.
  IF b.category <> 'streak' THEN RETURN false; END IF;
  req := CASE WHEN jsonb_typeof(b.requirements) = 'array' THEN b.requirements->0 ELSE b.requirements END;
  IF req->>'type' <> 'streak' THEN RETURN false; END IF;
  target := coalesce((req->>'target')::int, 0);
  SELECT greatest(coalesce(longest_streak, 0), coalesce(current_streak, 0)) INTO best
  FROM public.student_streaks WHERE student_account_id = p_student;
  RETURN target > 0 AND coalesce(best, 0) >= target;
END $$;

CREATE OR REPLACE FUNCTION public.guard_student_badge()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND NOT public.is_platform_staff() THEN
    NEW.progress := least(greatest(coalesce(NEW.progress, 0), 0), 100);
    IF TG_OP = 'UPDATE' AND OLD.is_unlocked THEN
      -- earned steps are never lost, and the date stays the original one
      NEW.is_unlocked := true; NEW.unlocked_at := OLD.unlocked_at; NEW.progress := 100;
    ELSIF coalesce(NEW.is_unlocked, false) THEN
      IF public.student_badge_earned(NEW.student_account_id, NEW.badge_id) THEN
        NEW.unlocked_at := now(); NEW.progress := 100;
      ELSE
        NEW.is_unlocked := false; NEW.unlocked_at := NULL; NEW.progress := least(NEW.progress, 99);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_student_badge ON public.student_badges;
CREATE TRIGGER guard_student_badge BEFORE INSERT OR UPDATE ON public.student_badges
  FOR EACH ROW EXECUTE FUNCTION public.guard_student_badge();

-- Badge points count in the league: paid once per badge into the active sprint.
CREATE OR REPLACE FUNCTION public.pay_badge_points()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pts int; cohort_name text; sprint uuid;
BEGIN
  IF NOT coalesce(NEW.is_unlocked, false) OR (TG_OP = 'UPDATE' AND coalesce(OLD.is_unlocked, false)) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.point_transactions
             WHERE student_account_id = NEW.student_account_id AND category = 'badge'
               AND metadata->>'badge_id' = NEW.badge_id::text) THEN
    RETURN NEW;
  END IF;
  SELECT point_value INTO pts FROM public.badges WHERE id = NEW.badge_id;
  IF coalesce(pts, 0) <= 0 THEN RETURN NEW; END IF;
  SELECT cohort INTO cohort_name FROM public.student_accounts WHERE id = NEW.student_account_id;
  SELECT id INTO sprint FROM public.sprints
  WHERE is_active AND coalesce(cohort, 'mn') = coalesce(cohort_name, 'mn')
  ORDER BY start_date DESC LIMIT 1;
  INSERT INTO public.point_transactions (student_account_id, sprint_id, points, category, metadata)
  VALUES (NEW.student_account_id, sprint, pts, 'badge', jsonb_build_object('badge_id', NEW.badge_id));
  IF sprint IS NOT NULL THEN
    PERFORM public.add_league_points(NEW.student_account_id, sprint, pts);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS pay_badge_points ON public.student_badges;
CREATE TRIGGER pay_badge_points AFTER INSERT OR UPDATE OF is_unlocked ON public.student_badges
  FOR EACH ROW EXECUTE FUNCTION public.pay_badge_points();
