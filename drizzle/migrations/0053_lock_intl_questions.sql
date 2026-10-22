-- The INT DB questions and the teachers' explanations are paid content, so only signed-in users can read them.
-- The educator page reads the explanation count from landing_public_stats instead.
REVOKE SELECT ON public.intl_questions FROM anon;
DROP POLICY IF EXISTS "Anyone can view active intl questions" ON public.intl_questions;
CREATE POLICY "Signed-in users view active intl questions" ON public.intl_questions FOR SELECT TO authenticated
  USING (is_active = true);

-- Public image URLs keep working; this only stops signed-out visitors listing the whole bucket.
DROP POLICY IF EXISTS "Anyone can view question images" ON storage.objects;
DROP POLICY IF EXISTS "Question images are publicly accessible" ON storage.objects;
CREATE POLICY "Signed-in users view question images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'question-images');

create or replace function public.landing_public_stats()
returns jsonb language sql stable security definer set search_path=public as $$
with t as (select student_id, score, created_at from practice_tests where score>0 and score<=800),
s as (select student_id, count(*) n,(array_agg(score order by created_at))[1] f,(array_agg(score order by created_at desc))[1] l, max(score) b from t group by 1)
select jsonb_build_object(
 'students', count(*), 'avg_gain', coalesce(round(avg(l-f) filter (where n>=2)),0),
 'best_gain', coalesce(round(avg(b-f) filter (where n>=2)),0),
 'gained100_pct', coalesce(round(100.0*count(*) filter (where n>=2 and b-f>=100)/nullif(count(*) filter (where n>=2),0)),0),
 'club700', count(*) filter (where b>=700), 'club800', count(*) filter (where b=800),
 'answers', (select count(*) from student_attempts), 'bluebook', (select count(*) from bluebook_attempts),
 'videos', (select count(*) from concept_videos where is_published),
 'math_explanations', (select count(*) from intl_questions where is_active and not hide_from_practice
   and subject in ('math', 'Math') and coalesce(rationale, '') <> '')) from s
$$;
revoke all on function public.landing_public_stats() from public;
grant execute on function public.landing_public_stats() to anon, authenticated;
