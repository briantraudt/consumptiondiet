# Consumption Diet

Simple MVP website for `consumptiondiet.com` plus a protected 6-day founder project-plan email system.

## Project Principles

The product, design, copy, development, accessibility, and operating standards live in [`PRODUCT_PRINCIPLES.md`](./PRODUCT_PRINCIPLES.md).

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
RESEND_API_KEY=
FOUNDER_EMAIL=brian@example.com
FROM_EMAIL="Consumption Diet <hello@consumptiondiet.com>"
CRON_SECRET=replace-with-a-long-random-secret
PROJECT_PLAN_START_DATE=2026-04-29
```

Notes:

- `RESEND_API_KEY`: server-side key from Resend or the Vercel Resend Marketplace integration.
- `FOUNDER_EMAIL`: Brian's recipient email for the internal 6-day execution plan.
- `FROM_EMAIL`: verified Resend sender, ideally something like `Consumption Diet <hello@consumptiondiet.com>`.
- `CRON_SECRET`: long random string used in the `Authorization` header.
- `PROJECT_PLAN_START_DATE`: day 1 date in `YYYY-MM-DD`, interpreted as an America/Chicago calendar date.

## Vercel Cron

The cron route is:

```txt
GET /api/cron/send-project-plan
```

It is protected by:

```txt
Authorization: Bearer $CRON_SECRET
```

`vercel.json` schedules it for:

```txt
0 12 * * *
```

Vercel Cron uses UTC. `12:00 UTC` is `7:00 AM America/Chicago` during daylight saving time. During standard time, `7:00 AM America/Chicago` is `13:00 UTC`, so update the schedule to `0 13 * * *` if exact winter timing matters.

## Manual Cron Test

With the dev server running:

```bash
curl -i http://localhost:3000/api/cron/send-project-plan \
  -H "Authorization: Bearer $CRON_SECRET"
```

Expected behavior:

- Before `PROJECT_PLAN_START_DATE`: returns a skipped response.
- Day 1 through Day 6: sends the matching email through Resend.
- After Day 6: returns a skipped response.

## Signup Storage

The public challenge form posts to:

```txt
POST /api/signup
```

For the MVP, submissions are appended to `data/signups.json` when the filesystem is writable and are also logged. On Vercel, local file writes are not durable, so replace this with Supabase, Vercel Postgres, or another persistent store before relying on signup data.

## Deploy to Vercel

1. Push this project to GitHub.
2. Import the project in Vercel.
3. Add the environment variables above in Vercel Project Settings.
4. Add and verify the `consumptiondiet.com` domain.
5. Configure DNS records as instructed by Vercel.
6. Deploy to production.
7. Confirm the production cron appears under Vercel Cron Jobs.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## MVP Limitations

- Public subscriber email automation is not built yet.
- Signup storage is a local JSON placeholder/log, not durable production storage.
- The About essay link is represented by the homepage story section until a Substack or essay URL exists.
- Vercel Cron runs only on production deployments.
