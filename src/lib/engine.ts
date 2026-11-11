// The three engines: the scheduler tick, incoming texts, and turning a payment into a live challenge.

import { coachReply } from "./coach";
import { appUrl } from "./config";
import { db } from "./db";
import { getHabit } from "./habits";
import { classifyInbound, detectSafetyFlag, type InboundIntent } from "./inbound";
import { CHALLENGE_DAYS, dayNumber, dueSends, type DueSend } from "./schedule";
import { texts } from "./texts";
import { addDays, diffDays, localNow, timeToMinutes } from "./time";
import { sendSms } from "./twilio";

const COACH_DAILY_LIMIT = 40;
const COACH_HISTORY = 10;

type UserRow = {
  id: string;
  phone: string;
  first_name: string | null;
  timezone: string;
  morning_time: string;
  evening_time: string;
  sms_opted_out_at: string | null;
};

type PartnerRow = {
  id: string;
  enrollment_id: string;
  name: string;
  phone: string;
  show_habit: boolean;
  invited_at: string | null;
  consented_at: string | null;
  opted_out_at: string | null;
};

type EnrollmentRow = {
  id: string;
  user_id: string;
  habit_slug: string;
  custom_habit: string | null;
  start_date: string;
  status: string;
  result_token: string;
  users: UserRow;
  partners: PartnerRow | PartnerRow[] | null;
};

type MessageKind =
  | "welcome" | "morning" | "evening" | "checkin_reply" | "coach" | "weekly" | "complete"
  | "partner_invite" | "partner_alert" | "partner_weekly" | "safety" | "system";

const ENROLLMENT_SELECT = "*, users!inner(*), partners(*)";

function partnerOf(e: EnrollmentRow): PartnerRow | null {
  const p = Array.isArray(e.partners) ? e.partners[0] : e.partners;
  return p ?? null;
}

function activePartner(e: EnrollmentRow): PartnerRow | null {
  const p = partnerOf(e);
  return p && p.consented_at && !p.opted_out_at ? p : null;
}

function firstName(e: EnrollmentRow): string {
  return e.users.first_name?.trim() || "Your friend";
}

export function habitPhrase(e: { habit_slug: string; custom_habit: string | null }): string {
  return e.custom_habit?.trim().toLowerCase() || getHabit(e.habit_slug)?.phrase || "this habit";
}

function partnerLabel(e: EnrollmentRow, p: PartnerRow): string {
  return p.show_habit ? `their 30 days off ${habitPhrase(e)}` : "their 30-day challenge";
}

async function logMessage(m: {
  userId?: string | null;
  partnerId?: string | null;
  enrollmentId?: string | null;
  direction: "in" | "out";
  kind: MessageKind;
  body: string;
  sid?: string | null;
}): Promise<{ id: string } | null> {
  const { data, error } = await db()
    .from("messages")
    .insert({
      user_id: m.userId ?? null,
      partner_id: m.partnerId ?? null,
      enrollment_id: m.enrollmentId ?? null,
      direction: m.direction,
      kind: m.kind,
      body: m.body,
      twilio_sid: m.sid ?? null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return null; // already logged (webhook retry)
    throw new Error(`Could not log message: ${error.message}`);
  }
  return data;
}

async function textUser(e: EnrollmentRow, kind: MessageKind, body: string): Promise<void> {
  if (e.users.sms_opted_out_at) return;
  const sid = await sendSms(e.users.phone, body);
  await logMessage({ userId: e.user_id, enrollmentId: e.id, direction: "out", kind, body, sid });
}

async function textPartner(e: EnrollmentRow, p: PartnerRow, kind: MessageKind, body: string): Promise<void> {
  if (p.opted_out_at) return;
  const sid = await sendSms(p.phone, body);
  await logMessage({ partnerId: p.id, enrollmentId: e.id, direction: "out", kind, body, sid });
}

/** Reserve a send so it can never go out twice. False means it was already sent. */
async function claim(enrollmentId: string, kind: string, sendDate: string): Promise<boolean> {
  const { error } = await db()
    .from("scheduled_sends")
    .insert({ enrollment_id: enrollmentId, kind, send_date: sendDate });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(`Could not claim send: ${error.message}`);
}

async function unclaim(enrollmentId: string, kind: string, sendDate: string): Promise<void> {
  await db()
    .from("scheduled_sends")
    .delete()
    .match({ enrollment_id: enrollmentId, kind, send_date: sendDate });
}

async function countWins(enrollmentId: string): Promise<number> {
  const { count, error } = await db()
    .from("check_ins")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", enrollmentId)
    .eq("won", true);
  if (error) throw new Error(`Could not count wins: ${error.message}`);
  return count ?? 0;
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
  return row.body.replaceAll("{habit}", habitPhrase(e));
}

async function hasAnyVideo(): Promise<boolean> {
  const { count } = await db().from("videos").select("id", { count: "exact", head: true });
  return (count ?? 0) > 0;
}

// ---------------------------------------------------------------- scheduler

export type TickSummary = { checked: number; sent: number; skipped: number; errors: string[] };

async function sendDue(e: EnrollmentRow, due: DueSend, hasVideo: boolean): Promise<void> {
  const startUrl = `${appUrl()}/start`;

  if (due.kind === "morning") {
    const prompt = await getPrompt(e, due.dayNumber);
    await textUser(e, "morning", texts.morning({
      day: due.dayNumber,
      prompt,
      videoUrl: hasVideo ? `${appUrl()}/watch` : null,
    }));

    // Tell the partner if yesterday went by with no check-in.
    const partner = activePartner(e);
    if (partner && due.dayNumber >= 2) {
      const yesterday = addDays(due.sendDate, -1);
      const { count } = await db()
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("enrollment_id", e.id)
        .eq("day", yesterday);
      if ((count ?? 0) === 0 && (await claim(e.id, "partner_alert", yesterday))) {
        await textPartner(e, partner, "partner_alert", texts.partnerNoCheckIn({ firstName: firstName(e) }));
      }
    }
    return;
  }

  if (due.kind === "evening") {
    await textUser(e, "evening", texts.evening({ day: due.dayNumber }));
    return;
  }

  const won = await countWins(e.id);

  if (due.kind === "weekly") {
    // Days finished so far: today isn't checked in yet when this sends.
    const daysSoFar = due.dayNumber - 1;
    await textUser(e, "weekly", texts.weekly({ won, day: daysSoFar }));
    const partner = activePartner(e);
    if (partner && (await claim(e.id, "partner_weekly", due.sendDate))) {
      await textPartner(e, partner, "partner_weekly", texts.partnerWeekly({
        firstName: firstName(e), won, day: daysSoFar, startUrl,
      }));
    }
    return;
  }

  // complete
  await textUser(e, "complete", texts.complete({
    won,
    resultUrl: `${appUrl()}/r/${e.result_token}`,
    startUrl,
  }));
  await db().from("enrollments").update({ status: "completed" }).eq("id", e.id);
}

/** Runs every 15 minutes. Sends whatever is due and moves challenges through their stages. */
export async function runTick(now: Date = new Date()): Promise<TickSummary> {
  const summary: TickSummary = { checked: 0, sent: 0, skipped: 0, errors: [] };

  const { data, error } = await db()
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .in("status", ["scheduled", "active"]);
  if (error) throw new Error(`Could not load enrollments: ${error.message}`);

  const enrollments = (data ?? []) as EnrollmentRow[];
  const hasVideo = enrollments.length > 0 ? await hasAnyVideo() : false;

  for (const e of enrollments) {
    summary.checked += 1;
    try {
      const local = localNow(now, e.users.timezone);
      const day = dayNumber(e.start_date, local.date);

      if (e.status === "scheduled" && day >= 1) {
        await db().from("enrollments").update({ status: "active" }).eq("id", e.id);
      }
      if (day > CHALLENGE_DAYS + 1) {
        await db().from("enrollments").update({ status: "completed" }).eq("id", e.id);
        continue;
      }
      if (e.users.sms_opted_out_at) continue;

      const due = dueSends(
        {
          startDate: e.start_date,
          morningMinutes: timeToMinutes(e.users.morning_time),
          eveningMinutes: timeToMinutes(e.users.evening_time),
        },
        local,
      );

      for (const item of due) {
        if (!(await claim(e.id, item.kind, item.sendDate))) {
          summary.skipped += 1;
          continue;
        }
        try {
          await sendDue(e, item, hasVideo);
          summary.sent += 1;
        } catch (sendError) {
          await unclaim(e.id, item.kind, item.sendDate); // retry on the next tick
          throw sendError;
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("tick: enrollment failed", { enrollmentId: e.id, message });
      summary.errors.push(`${e.id}: ${message}`);
    }
  }

  return summary;
}

// ---------------------------------------------------------------- incoming texts

function inboundKind(intent: InboundIntent): MessageKind {
  if (intent === "yes" || intent === "no") return "checkin_reply";
  if (intent === "other") return "coach";
  return "system";
}

async function latestEnrollment(userId: string): Promise<EnrollmentRow | null> {
  const { data, error } = await db()
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("user_id", userId)
    .in("status", ["scheduled", "active"])
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Could not load enrollment: ${error.message}`);
  return ((data ?? [])[0] as EnrollmentRow | undefined) ?? null;
}

/** Which day a Y/N reply counts for: the last evening check-in we asked about. */
async function checkInDate(e: EnrollmentRow, localDate: string): Promise<string | null> {
  const { data } = await db()
    .from("scheduled_sends")
    .select("send_date")
    .eq("enrollment_id", e.id)
    .eq("kind", "evening")
    .order("send_date", { ascending: false })
    .limit(1);
  const lastAsked = data?.[0]?.send_date as string | undefined;
  if (lastAsked && diffDays(localDate, lastAsked) <= 1) return lastAsked;

  const day = dayNumber(e.start_date, localDate);
  return day >= 1 && day <= CHALLENGE_DAYS ? localDate : null;
}

async function recordCheckIn(e: EnrollmentRow, date: string, won: boolean): Promise<void> {
  const { error } = await db()
    .from("check_ins")
    .upsert({ enrollment_id: e.id, day: date, won }, { onConflict: "enrollment_id,day" });
  if (error) throw new Error(`Could not save check-in: ${error.message}`);

  const wins = await countWins(e.id);
  const day = dayNumber(e.start_date, date);

  if (won) {
    await textUser(e, "checkin_reply", texts.win({ won: wins, day }));
    return;
  }

  await textUser(e, "checkin_reply", texts.loss({ won: wins }));
  const partner = activePartner(e);
  if (partner && (await claim(e.id, "partner_alert", date))) {
    await textPartner(e, partner, "partner_alert", texts.partnerMissed({
      firstName: firstName(e),
      label: partnerLabel(e, partner),
    }));
  }
}

async function coach(e: EnrollmentRow, body: string, inboundId: string, now: Date): Promise<void> {
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const { count } = await db()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", e.user_id)
    .eq("direction", "out")
    .eq("kind", "coach")
    .gte("created_at", since);
  if ((count ?? 0) >= COACH_DAILY_LIMIT) {
    await textUser(e, "system", texts.coachUnavailable());
    return;
  }

  const { data: recent } = await db()
    .from("messages")
    .select("id, direction, body")
    .eq("user_id", e.user_id)
    .neq("id", inboundId)
    .order("created_at", { ascending: false })
    .limit(COACH_HISTORY);
  const history = (recent ?? [])
    .reverse()
    .map((m) => ({ direction: m.direction as "in" | "out", body: m.body as string }));

  const local = localNow(now, e.users.timezone);
  try {
    const reply = await coachReply({
      firstName: firstName(e),
      habit: habitPhrase(e),
      day: Math.min(dayNumber(e.start_date, local.date), CHALLENGE_DAYS),
      daysWon: await countWins(e.id),
      history,
      message: body,
    });
    await textUser(e, "coach", reply);
  } catch (err) {
    console.error("coach failed", { enrollmentId: e.id, message: err instanceof Error ? err.message : err });
    await textUser(e, "system", texts.coachUnavailable());
  }
}

export async function handleInbound(
  from: string,
  body: string,
  sid: string,
  now: Date = new Date(),
): Promise<void> {
  const intent = classifyInbound(body);

  const { data: userData } = await db().from("users").select("*").eq("phone", from).limit(1);
  const user = (userData?.[0] as UserRow | undefined) ?? null;
  const { data: partnerData } = await db().from("partners").select("*").eq("phone", from);
  const partners = (partnerData ?? []) as PartnerRow[];

  const logged = await logMessage({
    userId: user?.id,
    partnerId: user ? null : partners[0]?.id,
    direction: "in",
    kind: inboundKind(intent),
    body,
    sid,
  });
  if (!logged) return; // Twilio retried a text we already handled

  if (intent === "stop") {
    const at = now.toISOString();
    if (user) await db().from("users").update({ sms_opted_out_at: at }).eq("id", user.id);
    if (partners.length) await db().from("partners").update({ opted_out_at: at }).eq("phone", from);
    return; // Twilio sends the opt-out confirmation itself
  }
  if (intent === "start") {
    if (user) await db().from("users").update({ sms_opted_out_at: null }).eq("id", user.id);
    return;
  }
  if (intent === "help") return; // Twilio answers HELP itself

  // A partner saying YES to their invite.
  if (intent === "yes") {
    const pending = partners.filter((p) => p.invited_at && !p.consented_at && !p.opted_out_at);
    if (pending.length) {
      for (const p of pending) {
        await db().from("partners").update({ consented_at: now.toISOString() }).eq("id", p.id);
        const { data } = await db()
          .from("enrollments").select(ENROLLMENT_SELECT).eq("id", p.enrollment_id).limit(1);
        const e = data?.[0] as EnrollmentRow | undefined;
        if (e) await textPartner(e, p, "partner_invite", texts.partnerWelcome({ firstName: firstName(e) }));
      }
      return;
    }
  }

  if (!user || user.sms_opted_out_at) return; // unknown numbers get no reply

  const e = await latestEnrollment(user.id);
  if (!e) {
    // One reminder a day at most, so two bots can't loop.
    const since = new Date(now.getTime() - 86_400_000).toISOString();
    const { count } = await db()
      .from("messages").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("direction", "out").eq("kind", "system").gte("created_at", since);
    if ((count ?? 0) === 0) {
      const text = texts.notEnrolled({ startUrl: `${appUrl()}/start` });
      const outSid = await sendSms(user.phone, text);
      await logMessage({ userId: user.id, direction: "out", kind: "system", body: text, sid: outSid });
    }
    return;
  }

  const flag = detectSafetyFlag(body);
  if (flag) {
    await textUser(e, "safety", flag === "crisis" ? texts.safetyCrisis() : texts.safetyMedical());
    return;
  }

  if (intent === "yes" || intent === "no") {
    const local = localNow(now, e.users.timezone);
    const date = await checkInDate(e, local.date);
    if (date) {
      await recordCheckIn(e, date, intent === "yes");
      return;
    }
  }

  await coach(e, body, logged.id, now);
}

// ---------------------------------------------------------------- payment

/** Called when Stripe confirms payment. Safe to call twice. */
export async function activateEnrollment(
  enrollmentId: string,
  stripeCustomerId: string | null,
): Promise<boolean> {
  const { data, error } = await db()
    .from("enrollments")
    .update({ status: "scheduled", stripe_customer_id: stripeCustomerId })
    .eq("id", enrollmentId)
    .eq("status", "pending_payment")
    .select(ENROLLMENT_SELECT);
  if (error) throw new Error(`Could not activate enrollment: ${error.message}`);
  const e = data?.[0] as EnrollmentRow | undefined;
  if (!e) return false; // already active, or not found

  if (await claim(e.id, "welcome", e.start_date)) {
    try {
      await textUser(e, "welcome", texts.welcome({
        firstName: firstName(e),
        phrase: habitPhrase(e),
        startDate: e.start_date,
        morning: timeToMinutes(e.users.morning_time),
        evening: timeToMinutes(e.users.evening_time),
      }));
    } catch (err) {
      await unclaim(e.id, "welcome", e.start_date);
      console.error("welcome text failed", { enrollmentId: e.id, message: err instanceof Error ? err.message : err });
    }
  }

  const partner = partnerOf(e);
  if (partner && !partner.invited_at && !partner.opted_out_at) {
    try {
      await textPartner(e, partner, "partner_invite", texts.partnerInvite({
        firstName: firstName(e),
        label: partnerLabel(e, partner),
      }));
      await db().from("partners").update({ invited_at: new Date().toISOString() }).eq("id", partner.id);
    } catch (err) {
      console.error("partner invite failed", { enrollmentId: e.id, message: err instanceof Error ? err.message : err });
    }
  }

  return true;
}
