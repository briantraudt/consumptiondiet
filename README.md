# Consumption Diet

A 30-day challenge to quit one habit, delivered by text message. No app.

The product, design, copy, and development standards live in [`PRODUCT_PRINCIPLES.md`](./PRODUCT_PRINCIPLES.md).

## How it works

1. **Sign up** at `/start`: pick a habit (10 plus a typed "Other"), answer safety questions if the habit has them, choose a start date and text times, optionally add an accountability partner, agree to texts.
2. **Pay** through Stripe Checkout. The habit is never sent to Stripe.
3. **Each morning**: a text with that day's prompt and a link to the daily video (`/watch`).
4. **Each evening**: "Did you win today? Reply Y or N."
5. **Any other reply** goes to the AI coach, which answers with one thing to do in the next 10 minutes.
6. **Sunday**: a summary of days won. A partner who said YES gets one too.
7. **Day 31**: a wrap-up text with a shareable result page (`/r/<token>`), which never shows the habit.

## The pieces

| Piece | Where |
|---|---|
| Signup and checkout | `src/app/start`, `src/app/api/enroll` |
| Payment confirmed, welcome text, partner invite | `src/app/api/stripe/webhook` |
| Incoming texts (check-ins, coach, STOP, partner YES) | `src/app/api/twilio/inbound` |
| Scheduler, called every 15 minutes | `src/app/api/cron/tick` |
| All three engines | `src/lib/engine.ts` |
| When each text is due (pure logic) | `src/lib/schedule.ts` |
| Habits, screening questions, typed-habit rules | `src/lib/habits.ts`, `src/lib/custom-habit.ts` |
| Coach prompt and limits | `src/lib/coach.ts` |
| Every fixed text we send | `src/lib/texts.ts` |
| Daily video and numbers | `/admin` |
| Database schema | `supabase/migrations` |

Daily prompts live in the `prompts` table (`habit_slug`, `day_number`, `body`), so they can be rewritten without a deploy. A habit/day with no prompt of its own falls back to the general track stored under `other`. `{habit}` in a prompt is replaced with the user's habit.

## Safety rules built in

- Alcohol, gambling, and weed ask screening questions at signup. Answers that suggest physical dependence or crisis get a helpline and no charge. Answers are not stored.
- A typed "Other" habit is checked against fixed rules first (drugs, medication, food restriction, self-harm are referred out), then by a model.
- Incoming texts are checked for crisis and medical red-flag wording before the coach sees them. A match gets a fixed message with 988 / 911 and never reaches the model.
- Nothing is texted to anyone before payment. Partners get one invite and nothing more unless they reply YES.
- Every send is claimed in `scheduled_sends` first, so a text can't go out twice. A text more than 3 hours late is skipped.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

## Checks

```bash
npm test        # unit tests (schedule, inbound parsing, screening, signatures)
npm run lint
npm run build
```

## Environment variables

See `.env.example`. All secrets are server-only.

## Webhooks to register

- **Stripe**: `POST https://www.consumptiondiet.com/api/stripe/webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- **Twilio**: on the messaging service or number, incoming messages `POST https://www.consumptiondiet.com/api/twilio/inbound`. `APP_URL` must match the URL Twilio calls exactly, or signature checks fail.

## Scheduler

`GET /api/cron/tick` with `Authorization: Bearer $CRON_SECRET`, every 15 minutes. It is not in `vercel.json` yet: Vercel's Hobby plan only allows daily crons and rejects the deploy otherwise. Either add `{"path": "/api/cron/tick", "schedule": "*/15 * * * *"}` on a Pro plan, or call it from Supabase `pg_cron`.

## Not built yet

- Habit-specific prompts for the 10 habits (the general track covers every habit until then).
- The $9/month continuation after day 30.
- Money and time saved in the Sunday summary.
- Admin view of conversations.
