# Consumption Diet

A 30-day challenge to quit one habit, delivered by text message. No app.

The product, design, copy, and development standards live in [`PRODUCT_PRINCIPLES.md`](./PRODUCT_PRINCIPLES.md).

## How it works

Everything happens by text. There is no web signup form.

1. **Join**: text BEGIN to the number (the `/start` page shows it, with a tap-to-text button on phones).
2. **Sign up in about five texts**: the habit in your own words, a safety check for some habits, date of birth plus the current time (which sets the time zone), your morning and evening times, then YES to consent.
3. **Free week**: the first 7 days need no card. On the evening of day 7 a payment link arrives ($31 once, Stripe Checkout). Unpaid challenges pause on day 8 with their place saved.
4. **Each morning**: that day's prompt, ending "Reply 1 if you're in." If a video was posted for that day, a link to `/watch`.
5. **Each evening**: "Did you win today? Reply Y or N."
6. **Any time**: URGE, SLIP, STATS, TIME, PAUSE, RESUME, PARTNER, MENU, DELETE. Anything else goes to the AI coach.
7. **Silence**: one missed day adds a line to the next morning text; three changes the evening text to a gentler one; seven pauses the texts with their place saved.
8. **Day 31**: a wrap-up text with a shareable result page (`/r/<token>`), which never shows the habit.

## The pieces

| Piece | Where |
|---|---|
| Incoming texts: signup, commands, check-ins, partner codes, coach | `src/lib/conversation.ts` (via `src/app/api/twilio/inbound`) |
| Scheduler, called every 15 minutes | `src/lib/engine.ts` (via `src/app/api/cron/tick`) |
| Payment link and confirmation | `src/app/pay/[token]`, `src/app/api/stripe/webhook` |
| Reading what people type (commands, times, dates, opt-outs) | `src/lib/parse.ts` |
| When each text is due (pure logic) | `src/lib/schedule.ts` |
| Habits, screening questions, typed-habit rules | `src/lib/habits.ts`, `src/lib/custom-habit.ts` |
| Coach prompt and limits | `src/lib/coach.ts` |
| Every fixed text we send | `src/lib/texts.ts` |
| Sending, logging, pause and resume | `src/lib/core.ts` |
| Daily video and numbers | `/admin` |
| Database schema | `supabase/migrations` |

Daily prompts live in the `prompts` table (`habit_slug`, `day_number`, `body`), so they can be rewritten without a deploy. A habit/day with no prompt of its own falls back to the general track stored under `other`.

## Rules built in

- **No text names a habit.** Carriers filter on those words and texts show on lock screens. `tests/texts.test.ts` checks every fixed text, and a coach reply that names a habit is replaced with a fixed one.
- **Consent comes from the person's own phone.** They text BEGIN, see the disclosures, and reply YES. Nothing recurring is sent before that.
- **Partners opt in themselves.** The user forwards an invite; the partner texts `PARTNER <code>` from their own phone. We never text a number someone else supplied.
- **Age gate.** Date of birth is asked once; under 18 is declined, and the alcohol challenge needs 21. Only the result is stored.
- **Safety.** Alcohol and gambling ask screening questions by text; answers that suggest dependence or crisis get a helpline and signup stops. Crisis and medical wording in any text gets a fixed 988 / 911 reply and never reaches the model.
- **Opt-out in any words.** "Please stop texting me" is treated like STOP.
- **Held habits.** `HELD_HABITS` in `src/lib/habits.ts` lists habits not offered yet (currently weed).
- **Retention.** Message text is erased 90 days after it was sent. DELETE erases everything.
- **No double sends.** Every send is claimed in `scheduled_sends` first. A text more than 2 hours late is skipped.

## Run locally

```bash
npm install
cp .env.example .env.local   # then fill it in
npm run dev
```

## Checks

```bash
npm test        # unit tests (schedule, parsing, wording rules, screening, signatures)
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

- Habit-specific prompts for each habit (the general track covers every habit until then).
- "Cut down" goals with a personal limit, for habits like sugar or social media.
- Storing the person's own reason and slip plan and sending them back later.
- RESTART (back to day 1) and continuing after day 30.
- A QR code on `/start` for desktop visitors.
- Admin view of conversations.
