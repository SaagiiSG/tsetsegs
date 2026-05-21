
create table if not exists public.sms_inbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  twilio_sid text unique,
  from_phone text not null,
  to_phone text not null,
  body text,
  num_media int default 0,
  media_urls jsonb,
  matched_student_id uuid references public.students(id) on delete set null,
  matched_role text check (matched_role in ('parent','student','unknown')) default 'unknown',
  read_at timestamptz,
  raw jsonb
);

create index if not exists sms_inbox_created_idx on public.sms_inbox(created_at desc);
create index if not exists sms_inbox_from_idx on public.sms_inbox(from_phone);
create index if not exists sms_inbox_student_idx on public.sms_inbox(matched_student_id);

alter table public.sms_inbox enable row level security;

create policy "Admins view inbox" on public.sms_inbox
  for select to authenticated
  using (has_role(auth.uid(),'admin'::app_role) or has_role(auth.uid(),'teacher'::app_role));

create policy "Admins update inbox" on public.sms_inbox
  for update to authenticated
  using (has_role(auth.uid(),'admin'::app_role) or has_role(auth.uid(),'teacher'::app_role));
