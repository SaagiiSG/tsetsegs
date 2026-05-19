
-- Enable pg_net for async HTTP from triggers
create extension if not exists pg_net with schema extensions;

-- ============= sms_logs =============
create table public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('absence','welcome','manual')),
  recipient_role text not null check (recipient_role in ('parent','student','other')),
  to_phone text not null,
  from_phone text,
  body text not null,
  student_id uuid references public.students(id) on delete set null,
  batch_id uuid references public.batches(id) on delete set null,
  session_number int,
  status text,
  twilio_sid text,
  twilio_status text not null default 'pending',
  error text,
  dedupe_key text unique
);

create index idx_sms_logs_created_at on public.sms_logs (created_at desc);
create index idx_sms_logs_student on public.sms_logs (student_id);
create index idx_sms_logs_batch on public.sms_logs (batch_id);
create index idx_sms_logs_kind on public.sms_logs (kind);

alter table public.sms_logs enable row level security;

create policy "Admins manage sms logs"
  on public.sms_logs for all
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

create policy "Teachers can view sms logs for their batches"
  on public.sms_logs for select
  using (
    has_role(auth.uid(), 'teacher'::app_role)
    and (
      batch_id is null
      or exists (
        select 1 from public.batches b
        join public.teachers t on b.teacher ilike '%' || t.name || '%'
        where b.id = sms_logs.batch_id
          and t.username = get_current_teacher_username()
      )
    )
  );

-- ============= Helper: call edge function via pg_net =============
create or replace function public._post_edge_function(fn_name text, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  fn_url text := 'https://plfaixcjzrhpaxfhfstd.supabase.co/functions/v1/' || fn_name;
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsZmFpeGNqenJocGF4Zmhmc3RkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyMTY0NzEsImV4cCI6MjA3ODc5MjQ3MX0._tTYBsn8O2DO6WsNt2MqNZlNQJp1Gj5nQUSlpfsk2Sg';
begin
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := payload
  );
end;
$$;

-- ============= Attendance trigger =============
create or replace function public.notify_attendance_sms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  old_val text;
  new_val text;
  col_name text;
begin
  for i in 1..24 loop
    col_name := 'session_' || i;
    execute format('select ($1).%I::text', col_name) into new_val using NEW;
    if TG_OP = 'UPDATE' then
      execute format('select ($1).%I::text', col_name) into old_val using OLD;
    else
      old_val := null;
    end if;

    if new_val is not null
       and new_val in ('absent','sick','excused')
       and (old_val is distinct from new_val)
    then
      perform public._post_edge_function(
        'notify-attendance-change',
        jsonb_build_object(
          'student_id', NEW.student_id,
          'batch_id', NEW.batch_id,
          'session_number', i,
          'status', new_val
        )
      );
    end if;
  end loop;
  return NEW;
end;
$$;

drop trigger if exists attendance_sms_trigger on public.attendance;
create trigger attendance_sms_trigger
after insert or update on public.attendance
for each row execute function public.notify_attendance_sms();

-- ============= Student welcome trigger =============
create or replace function public.notify_student_welcome_sms()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.phone is not null and length(NEW.phone) >= 8 then
    perform public._post_edge_function(
      'send-welcome-sms',
      jsonb_build_object('student_id', NEW.id)
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists student_welcome_sms_trigger on public.students;
create trigger student_welcome_sms_trigger
after insert on public.students
for each row execute function public.notify_student_welcome_sms();
