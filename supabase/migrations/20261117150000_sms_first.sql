-- SMS-first rebuild: text signup, free week, pause/resume, partner codes, neutral wording.

alter table public.users
  add column convo_state text,
  add column convo_data jsonb not null default '{}',
  add column age_confirmed_at timestamptz,
  add column over_21 boolean,
  add column age_gate_failed_at timestamptz,
  add column trial_used_at timestamptz;

alter table public.enrollments
  add column offset_days int not null default 0,
  add column paid_at timestamptz,
  add column trial_ends_on date,
  add column paused_on date,
  add column paused_day int,
  add column active_since date,
  add column pause_reason text check (pause_reason in ('user','silence','unpaid'));

alter table public.enrollments drop constraint enrollments_status_check;
alter table public.enrollments add constraint enrollments_status_check
  check (status in ('pending_payment','scheduled','active','paused','completed','continuing','canceled','referred_out'));

drop index public.enrollments_one_live_per_user;
create unique index enrollments_one_live_per_user
  on public.enrollments(user_id) where status in ('scheduled','active','paused');

alter table public.check_ins add column day_number int;

-- A partner now joins by texting a code from their own phone, so the row starts without a number.
alter table public.partners
  alter column name drop not null,
  alter column phone drop not null,
  add column invite_code text unique;

alter table public.scheduled_sends drop constraint scheduled_sends_kind_check;
alter table public.scheduled_sends add constraint scheduled_sends_kind_check
  check (kind in ('welcome','morning','evening','weekly','complete','partner_alert','partner_weekly',
                  'pay','pay_reminder','commit','pause_notice','partner_note'));

alter table public.messages drop constraint messages_kind_check;
alter table public.messages add constraint messages_kind_check
  check (kind in ('welcome','morning','evening','checkin_reply','coach','weekly','complete','partner_invite',
                  'partner_alert','partner_weekly','safety','system','inbound','onboarding','command','pay'));

-- Habits held back from launch stay in the table but can't be chosen.
alter table public.habits add column held boolean not null default false;
update public.habits set held = true where slug = 'weed';

-- Plan for a slip early (day 3), when most people drop out, instead of day 16.
update public.prompts set body = 'Plan for a slip before it happens. Finish this and text it to me: "If I slip, I will ___ and start again that day."', updated_at = now()
  where habit_slug = 'other' and day_number = 3;
update public.prompts set body = 'Notice when the urge hits today. Write down the time, the place, and what you felt.', updated_at = now()
  where habit_slug = 'other' and day_number = 16;
update public.prompts set body = 'Look back at your urge notes from day 16. What''s the pattern? Fix one thing that sets it off.', updated_at = now()
  where habit_slug = 'other' and day_number = 20;
