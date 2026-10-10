-- Track when a student opens the explanation while solving, so the
-- question's point potential is forfeited even after a page refresh.
alter table public.student_progress
  add column if not exists explanation_viewed boolean not null default false,
  add column if not exists explanation_viewed_at timestamptz;

-- New columns inherit the table's existing grants; re-assert to be safe.
grant select, insert, update, delete on public.student_progress to authenticated;
grant all on public.student_progress to service_role;