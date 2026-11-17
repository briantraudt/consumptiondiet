// The scheduler tick and what happens when a payment arrives.
// Incoming texts are handled in conversation.ts.

import { appUrl, FREE_DAYS, smsReady } from "./config";
import {
  activePartner, claim, countCheckIns, displayName, effectiveDay, ENROLLMENT_SELECT, LIVE_STATUSES,
  pauseEnrollment, payUrl, resumeEnrollment, textPartner, textUser, unclaim, type EnrollmentRow,
} from "./core";
import { db } from "./db";
import { WEB_TEXTS_PER_HOUR, webTextsLastHour } from "./web-signup";
import { CHALLENGE_DAYS, dueSends, inWindow, type DueSend } from "./schedule";
import { startLabel, texts } from "./texts";
import { addDays, diffDays, localNow, timeToMinutes, type LocalNow } from "./time";

const USER_PAUSE_DAYS = 7;
const SILENCE_PAUSE_DAYS = 7;
const SILENCE_GENTLE_DAYS = 3;
const PAUSE_EXPIRY_DAYS = 30;
const MESSAGE_RETENTION_DAYS = 90;

export function habitPhrase(e: { habit_slug: string; custom_habit: string | null }, phrase?: string): string {
  return e.custom_habit?.trim().toLowerCase() || phrase || "this habit";
}

async function getPrompt(e: EnrollmentRow, day: number): Promise<string> {
  const { data, error } = await db()
    .from("prompts")
    .select("habit_slug, body")
    .in("habit_slug", [e.habit_slug, "other"])
    .eq("day_number", day);
  if (error) throw new Error(`Could not load prompt: ${error.message}`);
  const row = data?.find((p) => p.habit_slug === e.habit_slug) ?? data?.[0];
  if (!row) throw new Error(`No prompt for ${e.habit_slug} day ${day}.`);
  // Prompts never name the habit: texts show on lock screens and carriers filter on those words.
  return row.body.replaceAll("{habit}", "this habit");
}

async function hasVideoFor(date: string): Promise<boolean> {
  const { count } = await db().from("videos").select("id", { count: "exact", head: true }).eq("video_date", date);
  return (count ?? 0) > 0;
}

/** Full days in a row, ending yesterday, with no text at all from this person. */
async function silentDays(e: EnrollmentRow, local: LocalNow): Promise<number> {
  const { data } = await db()
    .from("messages")
    .select("created_at")
    .eq("user_id", e.user_id)
    .eq("direction", "in")
    .order("created_at", { ascending: false })
    .limit(1);
  const last = data?.[0]?.created_at as string | undefined;
  const lastDate = last ? localNow(new Date(last), e.users.timezone).date : null;
  // Count from the day before day 1, or from the day they came back from a pause.
  const runStart = e.active_since ?? addDays(e.start_date, -1);
  const baseline = lastDate && diffDays(lastDate, runStart) > 0 ? lastDate : runStart;
  return Math.max(diffDays(local.date, baseline) - 1, 0);
}

export type TickSummary = { checked: number; sent: number; skipped: number; errors: string[] };

async function sendDue(e: EnrollmentRow, due: DueSend, local: LocalNow): Promise<boolean> {
  const silent = due.kind === "morning" || due.kind === "evening" ? await silentDays(e, local) : 0;

  if (due.kind === "morning") {
    if (silent >= SILENCE_PAUSE_DAYS) {
      await textUser(e, "system", texts.pausedForSilence({ day: due.dayNumber }));
      await pauseEnrollment(e, "silence", local.date, due.dayNumber);
      return false;
    }
    const prompt = await getPrompt(e, due.dayNumber);
    await textUser(e, "morning", texts.morning({
      day: due.dayNumber,
      prompt,
      videoUrl: (await hasVideoFor(local.date)) ? `${appUrl()}/watch` : null,
      missedYesterday: silent === 1 && due.dayNumber >= 2,
    }));

    // Tell the partner if yesterday went by with no check-in.
    if (activePartner(e) && due.dayNumber >= 2) {
      const yesterday = addDays(due.sendDate, -1);
      const { count } = await db()
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("enrollment_id", e.id)
        .eq("day", yesterday);
      if ((count ?? 0) === 0 && (await claim(e.id, "partner_alert", yesterday))) {
        await textPartner(e, "partner_alert", texts.partnerNoCheckIn({ firstName: displayName(e.users) }));
      }
    }
    return true;
  }

  if (due.kind === "evening") {
    const body = silent >= SILENCE_GENTLE_DAYS
      ? texts.eveningGentle({ day: due.dayNumber })
      : texts.evening({ day: due.dayNumber });
    await textUser(e, "evening", body);
    return true;
  }

  const { won } = await countCheckIns(e.id);

  if (due.kind === "weekly") {
    // Days finished so far: today isn't checked in yet when this sends.
    const daysSoFar = due.dayNumber - 1;
    await textUser(e, "weekly", texts.weekly({ won, day: daysSoFar }));
    if (activePartner(e) && (await claim(e.id, "partner_weekly", due.sendDate))) {
      await textPartner(e, "partner_weekly", texts.partnerWeekly({
        firstName: displayName(e.users), won, day: daysSoFar,
      }));
    }
    return true;
  }

  // complete
  await textUser(e, "complete", texts.complete({ won, resultUrl: `${appUrl()}/r/${e.result_token}` }));
  await db().from("enrollments").update({ status: "completed" }).eq("id", e.id);
  return true;
}

/** A paused challenge: come back after a week off, remind once about payment, or expire. */
async function handlePaused(e: EnrollmentRow, local: LocalNow): Promise<void> {
  if (!e.paused_on) return;
  const pausedFor = diffDays(local.date, e.paused_on);
  const morning = timeToMinutes(e.users.morning_time);

  if (e.pause_reason === "user" && pausedFor >= USER_PAUSE_DAYS - 1 && inWindow(local.minutes, morning)) {
    const day = await resumeEnrollment(e, local.date);
    await textUser(e, "system", texts.resumed({ day, morning }));
    return;
  }
  if (e.pause_reason === "unpaid" && pausedFor === 0 && inWindow(local.minutes, morning)) {
    if (await claim(e.id, "pay_reminder", local.date)) {
      await textUser(e, "pay", texts.payReminder({ payUrl: payUrl(e), day: e.paused_day ?? FREE_DAYS + 1 }));
    }
    return;
  }
  if (e.pause_reason !== "user" && pausedFor > PAUSE_EXPIRY_DAYS) {
    await db().from("enrollments").update({ status: "canceled" }).eq("id", e.id);
  }
}

/** Runs every 15 minutes. Sends whatever is due and moves challenges through their stages. */
export async function runTick(now: Date = new Date()): Promise<TickSummary> {
  const summary: TickSummary = { checked: 0, sent: 0, skipped: 0, errors: [] };

  const { data, error } = await db().from("enrollments").select(ENROLLMENT_SELECT).in("status", LIVE_STATUSES);
  if (error) throw new Error(`Could not load enrollments: ${error.message}`);

  for (const e of (data ?? []) as EnrollmentRow[]) {
    summary.checked += 1;
    try {
      if (e.users.sms_opted_out_at) continue;
      const local = localNow(now, e.users.timezone);

      if (e.status === "paused") {
        await handlePaused(e, local);
        continue;
      }

      // The day someone comes back from a pause is quiet. Their saved day starts tomorrow.
      if (e.active_since === local.date) continue;

      const day = effectiveDay(e, local.date);
      if (e.status === "scheduled" && day >= 1) {
        await db().from("enrollments").update({ status: "active" }).eq("id", e.id);
      }
      if (day > CHALLENGE_DAYS + 1) {
        await db().from("enrollments").update({ status: "completed" }).eq("id", e.id);
        continue;
      }

      // The free week is over and nothing has been paid: stop the texts, keep their place.
      if (!e.paid_at && e.trial_ends_on && diffDays(local.date, e.trial_ends_on) > 0) {
        await pauseEnrollment(e, "unpaid", local.date, day);
        await handlePaused({ ...e, status: "paused", pause_reason: "unpaid", paused_on: local.date, paused_day: day }, local);
        continue;
      }

      const morning = timeToMinutes(e.users.morning_time);
      const evening = timeToMinutes(e.users.evening_time);
      const due = dueSends(
        { startDate: e.start_date, offsetDays: e.offset_days, morningMinutes: morning, eveningMinutes: evening },
        local,
      );

      let stillActive = true;
      for (const item of due) {
        if (!stillActive) break;
        if (!(await claim(e.id, item.kind, item.sendDate))) {
          summary.skipped += 1;
          continue;
        }
        try {
          stillActive = await sendDue(e, item, local);
          summary.sent += 1;
        } catch (sendError) {
          await unclaim(e.id, item.kind, item.sendDate); // retry on the next tick
          throw sendError;
        }
      }

      // Last free day: after the evening check-in, send the link to keep going.
      if (
        stillActive && !e.paid_at && e.trial_ends_on === local.date &&
        inWindow(local.minutes, evening) && (await claim(e.id, "pay", local.date))
      ) {
        try {
          const { won } = await countCheckIns(e.id);
          await textUser(e, "pay", texts.freeWeekDone({ won, payUrl: payUrl(e) }));
          summary.sent += 1;
        } catch (sendError) {
          await unclaim(e.id, "pay", local.date);
          throw sendError;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("tick: enrollment failed", { enrollmentId: e.id, message });
      summary.errors.push(`${e.id}: ${message}`);
    }
  }

  await textWaitingWebSignups(now, summary);
  await purgeOldMessages(now, summary);
  return summary;
}

/** Message text is erased 90 days after it was sent. The row stays so counts still work. */
async function purgeOldMessages(now: Date, summary: TickSummary): Promise<void> {
  const cutoff = new Date(now.getTime() - MESSAGE_RETENTION_DAYS * 86_400_000).toISOString();
  const { error } = await db().from("messages").update({ body: "" }).lt("created_at", cutoff).neq("body", "");
  if (error) {
    console.error("tick: message purge failed", error.message);
    summary.errors.push(`purge: ${error.message}`);
  }
}

/** Called when Stripe confirms payment. Safe to call twice. */
export async function recordPayment(
  enrollmentId: string,
  stripeCustomerId: string | null,
  now: Date = new Date(),
): Promise<boolean> {
  const { data, error } = await db()
    .from("enrollments")
    .update({ paid_at: now.toISOString(), stripe_customer_id: stripeCustomerId })
    .eq("id", enrollmentId)
    .is("paid_at", null)
    .select(ENROLLMENT_SELECT);
  if (error) throw new Error(`Could not record payment: ${error.message}`);
  const e = data?.[0] as EnrollmentRow | undefined;
  if (!e) return false; // already recorded, or not found

  const local = localNow(now, e.users.timezone);
  const morning = timeToMinutes(e.users.morning_time);
  const tomorrow = addDays(local.date, 1);

  try {
    if (e.status === "pending_payment") {
      // A returning person who pays before starting. Day 1 is never in the past.
      const start = diffDays(e.start_date, tomorrow) >= 0 ? e.start_date : tomorrow;
      await db().from("enrollments").update({ status: "scheduled", start_date: start }).eq("id", e.id);
      await textUser(e, "pay", texts.paidStart({ startLabel: startLabel(start, tomorrow), morning }));
    } else if (e.status === "paused" && e.pause_reason === "unpaid") {
      const day = await resumeEnrollment(e, local.date);
      await textUser(e, "pay", texts.paidResumed({ day, morning }));
    } else {
      await textUser(e, "pay", texts.paid());
    }
  } catch (err) {
    console.error("payment text failed", { enrollmentId: e.id, message: err instanceof Error ? err.message : err });
  }
  return true;
}

/**
 * People who signed up on the website before texting was switched on, or while
 * the hourly limit was reached. They get their first text during the day.
 */
async function textWaitingWebSignups(now: Date, summary: TickSummary): Promise<void> {
  if (!smsReady()) return;
  const central = localNow(now, "America/Chicago").minutes;
  if (central < 10 * 60 || central >= 19 * 60) return;

  try {
    const room = WEB_TEXTS_PER_HOUR - (await webTextsLastHour(now));
    if (room <= 0) return;
    const { data, error } = await db()
      .from("users")
      .select("*")
      .eq("convo_state", "web_pending")
      .is("sms_opted_out_at", null)
      .order("created_at", { ascending: true })
      .limit(Math.min(room, 20));
    if (error) throw new Error(error.message);
    // Imported here because conversation.ts imports this file.
    const { startFromWeb } = await import("./conversation");
    for (const user of (data ?? []) as EnrollmentRow["users"][]) {
      await startFromWeb(user);
      summary.sent += 1;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("tick: waiting web signups failed", message);
    summary.errors.push(`web signups: ${message}`);
  }
}
