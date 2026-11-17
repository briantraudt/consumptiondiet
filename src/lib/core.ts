// Shared building blocks for the scheduler and the conversation: row types,
// sending and logging texts, and pausing and resuming a challenge.

import { appUrl } from "./config";
import { db } from "./db";
import { addDays, diffDays } from "./time";
import { sendSms } from "./twilio";

export type UserRow = {
  id: string;
  phone: string;
  first_name: string | null;
  timezone: string;
  morning_time: string;
  evening_time: string;
  sms_consent_at: string | null;
  sms_opted_out_at: string | null;
  convo_state: string | null;
  convo_data: Record<string, unknown>;
  age_confirmed_at: string | null;
  over_21: boolean | null;
  age_gate_failed_at: string | null;
  trial_used_at: string | null;
};

export type PartnerRow = {
  id: string;
  enrollment_id: string;
  phone: string | null;
  invite_code: string | null;
  consented_at: string | null;
  opted_out_at: string | null;
};

export type EnrollmentRow = {
  id: string;
  user_id: string;
  habit_slug: string;
  custom_habit: string | null;
  start_date: string;
  status: string;
  result_token: string;
  offset_days: number;
  paid_at: string | null;
  trial_ends_on: string | null;
  paused_on: string | null;
  paused_day: number | null;
  pause_reason: "user" | "silence" | "unpaid" | null;
  /** Set when a pause ends, so the paused days aren't counted as silence. */
  active_since: string | null;
  users: UserRow;
  partners: PartnerRow | PartnerRow[] | null;
};

export type MessageKind =
  | "welcome" | "morning" | "evening" | "checkin_reply" | "coach" | "weekly" | "complete"
  | "partner_invite" | "partner_alert" | "partner_weekly" | "safety" | "system"
  | "inbound" | "onboarding" | "command" | "pay";

export const ENROLLMENT_SELECT = "*, users!inner(*), partners(*)";
export const LIVE_STATUSES = ["scheduled", "active", "paused"];

export function partnerOf(e: EnrollmentRow): PartnerRow | null {
  const p = Array.isArray(e.partners) ? e.partners[0] : e.partners;
  return p ?? null;
}

export function activePartner(e: EnrollmentRow): (PartnerRow & { phone: string }) | null {
  const p = partnerOf(e);
  return p && p.phone && p.consented_at && !p.opted_out_at ? (p as PartnerRow & { phone: string }) : null;
}

export function displayName(user: UserRow): string {
  return user.first_name?.trim() || "Your friend";
}

/** Which day of the 30 a calendar date is, after any paused days are taken out. */
export function effectiveDay(e: Pick<EnrollmentRow, "start_date" | "offset_days">, localDate: string): number {
  return diffDays(localDate, e.start_date) + 1 - e.offset_days;
}

export function payUrl(e: Pick<EnrollmentRow, "result_token">): string {
  return `${appUrl()}/pay/${e.result_token}`;
}

export async function logMessage(m: {
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

/** Text a person who has a row in users. Does nothing if they opted out. */
export async function textPerson(
  user: UserRow,
  kind: MessageKind,
  body: string,
  enrollmentId?: string | null,
): Promise<void> {
  if (user.sms_opted_out_at) return;
  const sid = await sendSms(user.phone, body);
  await logMessage({ userId: user.id, enrollmentId, direction: "out", kind, body, sid });
}

export async function textUser(e: EnrollmentRow, kind: MessageKind, body: string): Promise<void> {
  await textPerson(e.users, kind, body, e.id);
}

export async function textPartner(e: EnrollmentRow, kind: MessageKind, body: string): Promise<void> {
  const p = activePartner(e);
  if (!p) return;
  const sid = await sendSms(p.phone, body);
  await logMessage({ partnerId: p.id, enrollmentId: e.id, direction: "out", kind, body, sid });
}

/** Reserve a send so it can never go out twice. False means it was already sent. */
export async function claim(enrollmentId: string, kind: string, sendDate: string): Promise<boolean> {
  const { error } = await db()
    .from("scheduled_sends")
    .insert({ enrollment_id: enrollmentId, kind, send_date: sendDate });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw new Error(`Could not claim send: ${error.message}`);
}

export async function unclaim(enrollmentId: string, kind: string, sendDate: string): Promise<void> {
  await db().from("scheduled_sends").delete().match({ enrollment_id: enrollmentId, kind, send_date: sendDate });
}

export async function countCheckIns(enrollmentId: string): Promise<{ won: number; slipped: number }> {
  const { data, error } = await db().from("check_ins").select("won").eq("enrollment_id", enrollmentId);
  if (error) throw new Error(`Could not count check-ins: ${error.message}`);
  const won = (data ?? []).filter((c) => c.won).length;
  return { won, slipped: (data ?? []).length - won };
}

export async function liveEnrollment(userId: string): Promise<EnrollmentRow | null> {
  const { data, error } = await db()
    .from("enrollments")
    .select(ENROLLMENT_SELECT)
    .eq("user_id", userId)
    .in("status", LIVE_STATUSES)
    .limit(1);
  if (error) throw new Error(`Could not load enrollment: ${error.message}`);
  return ((data ?? [])[0] as EnrollmentRow | undefined) ?? null;
}

/** Stop the daily texts and remember which day comes next. */
export async function pauseEnrollment(
  e: EnrollmentRow,
  reason: "user" | "silence" | "unpaid",
  today: string,
  nextDay: number,
): Promise<void> {
  const { error } = await db()
    .from("enrollments")
    .update({ status: "paused", pause_reason: reason, paused_on: today, paused_day: nextDay })
    .eq("id", e.id);
  if (error) throw new Error(`Could not pause: ${error.message}`);
}

/**
 * Start the daily texts again so that tomorrow is the saved day. Returns that day number.
 * The days spent paused are added to the offset so they never count as misses.
 */
export async function resumeEnrollment(e: EnrollmentRow, today: string): Promise<number> {
  const nextDay = e.paused_day ?? Math.max(effectiveDay(e, today) + 1, 1);
  const offset = diffDays(addDays(today, 1), e.start_date) + 1 - nextDay;
  const shift = offset - e.offset_days;
  const update: Record<string, unknown> = {
    status: "active",
    offset_days: offset,
    pause_reason: null,
    paused_on: null,
    paused_day: null,
    active_since: today,
  };
  // A week off during the free week doesn't use up free days.
  if (e.pause_reason === "user" && !e.paid_at && e.trial_ends_on && shift > 0) {
    update.trial_ends_on = addDays(e.trial_ends_on, shift);
  }
  const { error } = await db().from("enrollments").update(update).eq("id", e.id);
  if (error) throw new Error(`Could not resume: ${error.message}`);
  return nextDay;
}

/** True if we already sent this person a general notice in the last day. Stops reply loops. */
export async function sentSystemTextRecently(userId: string, now: Date): Promise<boolean> {
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  const { count } = await db()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("direction", "out")
    .eq("kind", "system")
    .gte("created_at", since);
  return (count ?? 0) > 0;
}
