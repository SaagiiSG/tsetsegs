create or replace function public.landing_public_stats()
returns jsonb language sql stable security definer set search_path=public as $$
with t as (select student_id, score, created_at from practice_tests where score>0 and score<=800),
s as (select student_id, count(*) n,(array_agg(score order by created_at))[1] f,(array_agg(score order by created_at desc))[1] l, max(score) b from t group by 1)
select jsonb_build_object(
 'students', count(*), 'avg_gain', coalesce(round(avg(l-f) filter (where n>=2)),0),
 'best_gain', coalesce(round(avg(b-f) filter (where n>=2)),0),
 'gained100_pct', coalesce(round(100.0*count(*) filter (where n>=2 and b-f>=100)/nullif(count(*) filter (where n>=2),0)),0),
 'club700', count(*) filter (where b>=700), 'club800', count(*) filter (where b=800),
 'answers', (select count(*) from student_attempts), 'bluebook', (select count(*) from bluebook_attempts)) from s
$$;
revoke all on function public.landing_public_stats() from public;
grant execute on function public.landing_public_stats() to anon, authenticated;