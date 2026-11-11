-- Day-31 "complete" text, and nicotine needs no medical gate (a helpline note is shown instead).
alter table public.scheduled_sends drop constraint scheduled_sends_kind_check;
alter table public.scheduled_sends add constraint scheduled_sends_kind_check
  check (kind in ('welcome','morning','evening','weekly','complete','partner_alert','partner_weekly'));

alter table public.messages drop constraint messages_kind_check;
alter table public.messages add constraint messages_kind_check
  check (kind in ('welcome','morning','evening','checkin_reply','coach','weekly','complete','partner_invite','partner_alert','partner_weekly','safety','system'));

update public.habits set needs_screening = false where slug = 'nicotine';

-- A user can only have one challenge running at a time.
create unique index enrollments_one_live_per_user
  on public.enrollments(user_id) where status in ('scheduled','active');

-- General 30-day track. Used for "Other" and as the fallback for any habit/day without its own prompt.
insert into public.prompts (habit_slug, day_number, body) values
  ('other', 1, 'Write down why you''re quitting {habit}. One sentence. Keep it where you''ll see it today.'),
  ('other', 2, 'Cut off the easiest access to {habit}. Delete it, toss it, or block it. Make it take effort.'),
  ('other', 3, 'Notice when the urge hits today. Write down the time, the place, and what you felt.'),
  ('other', 4, 'Tell one person you''re doing 30 days off {habit}. Saying it out loud makes it real.'),
  ('other', 5, 'Pick your hardest hour of the day. Plan exactly what you''ll do in that hour instead.'),
  ('other', 6, 'When the urge comes, wait 10 minutes. Set a timer. Most urges pass before it rings.'),
  ('other', 7, 'One week in. Write down one thing that''s better already, even if it''s small.'),
  ('other', 8, 'Choose a replacement: a walk, water, pushups, a call. Use it every time the urge hits today.'),
  ('other', 9, 'Change one thing about the place where the habit usually happens. Move the chair. Leave the room.'),
  ('other', 10, 'Go to bed 30 minutes early tonight. Tired people give in. Rested people don''t.'),
  ('other', 11, 'Spend 20 minutes outside today without your phone. Let your head get quiet.'),
  ('other', 12, 'Add up what {habit} cost you last month in money or hours. Write the number down.'),
  ('other', 13, 'Do one thing today that the habit used to crowd out. Fill the space with something good.'),
  ('other', 14, 'Two weeks. Text a friend one win from this week.'),
  ('other', 15, 'Halfway. Read your day 1 reason again. Still true? Add one more.'),
  ('other', 16, 'Plan for a slip before it happens. Finish this: "If I slip, I will ___ and start again that day."'),
  ('other', 17, 'Stress is the big trigger. Pick one way to handle stress today that isn''t {habit}.'),
  ('other', 18, 'Boredom check. List 5 things to do when you''re bored. Keep the list on your phone.'),
  ('other', 19, 'Say no once today, out loud, to something that pulls you back toward the habit.'),
  ('other', 20, 'Look back at your urge notes from day 3. What''s the pattern? Fix one thing that sets it off.'),
  ('other', 21, 'Three weeks. The urge is weaker than it was on day 1. Notice that today.'),
  ('other', 22, 'Help someone else today. Getting out of your own head is a strong defense.'),
  ('other', 23, 'Picture yourself 6 months from now without {habit}. What''s different? Write three things.'),
  ('other', 24, 'Name the one situation that still trips you up. Stay out of it completely this week.'),
  ('other', 25, 'Thank one person who has helped you these 25 days. A short text is enough.'),
  ('other', 26, 'Decide your rule for after day 30: never again, or clear limits? Write it in one sentence.'),
  ('other', 27, 'Set up your space for the long run. Whatever you cut off on day 2, keep it gone.'),
  ('other', 28, 'Write down the three things that worked best. That''s your playbook from here on.'),
  ('other', 29, 'Tomorrow is day 30. Plan one small way to mark it that has nothing to do with the habit.'),
  ('other', 30, 'Day 30. You did what most people only talk about. Check in tonight one last time.');
