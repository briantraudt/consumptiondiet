-- Consumption Diet: core schema (applied to project oleijsbzkytgbvqrwxbp on 2026-11-11)
create extension if not exists pgcrypto;

create table public.habits (
  slug text primary key,
  name text not null,
  sort_order int not null,
  needs_screening boolean not null default false,
  is_custom boolean not null default false
);

insert into public.habits (slug, name, sort_order, needs_screening, is_custom) values
  ('social-media', 'Social Media', 1, false, false),
  ('alcohol', 'Alcohol', 2, true, false),
  ('sugar', 'Sugar', 3, false, false),
  ('junk-food', 'Junk Food', 4, false, false),
  ('shopping', 'Shopping', 5, false, false),
  ('porn', 'Porn', 6, false, false),
  ('nicotine', 'Nicotine', 7, true, false),
  ('gambling', 'Gambling', 8, true, false),
  ('streaming', 'Streaming', 9, false, false),
  ('weed', 'Weed', 10, true, false),
  ('other', 'Other', 11, false, true);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  first_name text,
  timezone text not null default 'America/Chicago',
  morning_time time not null default '07:00',
  evening_time time not null default '20:00',
  sms_consent_at timestamptz,
  sms_opted_out_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  habit_slug text not null references public.habits(slug),
  custom_habit text,
  start_date date not null,
  status text not null default 'pending_payment'
    check (status in ('pending_payment','scheduled','active','completed','continuing','canceled','referred_out')),
  screening_answers jsonb,
  stripe_customer_id text,
  stripe_checkout_session_id text unique,
  stripe_subscription_id text,
  result_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  created_at timestamptz not null default now(),
  check (habit_slug <> 'other' or custom_habit is not null)
);
create index enrollments_user_id_idx on public.enrollments(user_id);
create index enrollments_status_idx on public.enrollments(status);
create index enrollments_habit_slug_idx on public.enrollments(habit_slug);

create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  habit_slug text not null references public.habits(slug),
  day_number int not null check (day_number between 1 and 30),
  body text not null,
  updated_at timestamptz not null default now(),
  unique (habit_slug, day_number)
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  day date not null,
  won boolean not null,
  created_at timestamptz not null default now(),
  unique (enrollment_id, day)
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null unique references public.enrollments(id) on delete cascade,
  name text not null,
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  show_habit boolean not null default false,
  invited_at timestamptz,
  consented_at timestamptz,
  opted_out_at timestamptz,
  created_at timestamptz not null default now()
);
create index partners_phone_idx on public.partners(phone);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  partner_id uuid references public.partners(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  kind text not null check (kind in ('welcome','morning','evening','checkin_reply','coach','weekly','partner_invite','partner_alert','partner_weekly','safety','system')),
  body text not null,
  twilio_sid text unique,
  created_at timestamptz not null default now()
);
create index messages_user_created_idx on public.messages(user_id, created_at desc);
create index messages_enrollment_idx on public.messages(enrollment_id);
create index messages_partner_idx on public.messages(partner_id);

-- One row per scheduled text per day; the unique key stops double sends.
create table public.scheduled_sends (
  id uuid primary key default gen_random_uuid(),
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  kind text not null check (kind in ('welcome','morning','evening','weekly','partner_alert','partner_weekly')),
  send_date date not null,
  sent_at timestamptz not null default now(),
  unique (enrollment_id, kind, send_date)
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  video_date date not null unique,
  youtube_id text not null,
  title text,
  created_at timestamptz not null default now()
);

-- Typed "Other" habits, kept for deciding which habit to add next.
create view public.custom_habit_counts with (security_invoker = true) as
  select lower(trim(custom_habit)) as habit, count(*) as signups
  from public.enrollments
  where custom_habit is not null
  group by 1
  order by 2 desc;

-- Lock everything down: only the server (secret key) reads or writes.
alter table public.habits enable row level security;
alter table public.users enable row level security;
alter table public.enrollments enable row level security;
alter table public.prompts enable row level security;
alter table public.check_ins enable row level security;
alter table public.partners enable row level security;
alter table public.messages enable row level security;
alter table public.scheduled_sends enable row level security;
alter table public.videos enable row level security;

-- The habit list is safe to show publicly on the signup page.
create policy "habits are public" on public.habits for select to anon, authenticated using (true);
