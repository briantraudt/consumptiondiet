// Everything that happens when a text comes in: signing up, command words,
// check-ins, the partner code, and the coach.

import { coachReply } from "./coach";
import { FREE_DAYS, launchDate, smsNumber } from "./config";
import {
  activePartner, claim, countCheckIns, displayName, effectiveDay, ENROLLMENT_SELECT, liveEnrollment,
  logMessage, partnerOf, pauseEnrollment, payUrl, resumeEnrollment, sentSystemTextRecently,
  textPartner, textPerson, textUser, type EnrollmentRow, type PartnerRow, type UserRow,
} from "./core";
import { checkCustomHabit } from "./custom-habit";
import { db } from "./db";
import { habitPhrase } from "./engine";
import { getHabit, HELD_HABITS, TEXT_SCREENING } from "./habits";
import { classifyInbound, detectSafetyFlag } from "./inbound";
import {
  ageOn, defaultStartDate, detectOptOutIntent, guessTimeZone, minutesToTime, parseBirthDate,
  parseCommand, parseStartDate, parseTimePair, type Command,
} from "./parse";
import { CHALLENGE_DAYS } from "./schedule";
import { startLabel, texts } from "./texts";
import { addDays, diffDays, localNow, timeToMinutes } from "./time";
import { sendSms } from "./twilio";

const COACH_DAILY_LIMIT = 40;
const COACH_HISTORY = 10;
const MAX_START_DAYS_AHEAD = 90;

type Onboarding = {
  habit?: string;
  custom?: string | null;
  screenIndex?: number;
  note?: string;
  morning?: number;
  evening?: number;
  startDate?: string;
};

// ---------------------------------------------------------------- small helpers

async function getOrCreateUser(phone: string): Promise<UserRow> {
  const { data } = await db().from("users").select("*").eq("phone", phone).limit(1);
  if (data?.[0]) return data[0] as UserRow;
  const { data: created, error } = await db().from("users").insert({ phone }).select("*").single();
  if (error) {
    // Two texts arrived at once and the other one created the row first.
    const { data: again } = await db().from("users").select("*").eq("phone", phone).limit(1);
    if (again?.[0]) return again[0] as UserRow;
    throw new Error(`Could not create user: ${error.message}`);
  }
  return created as UserRow;
}

async function setConvo(user: UserRow, state: string | null, data: Onboarding = {}): Promise<void> {
  const { error } = await db().from("users").update({ convo_state: state, convo_data: data }).eq("id", user.id);
  if (error) throw new Error(`Could not save conversation state: ${error.message}`);
  user.convo_state = state;
  user.convo_data = data;
}

function isYes(body: string): boolean {
  return ["y", "yes", "yes.", "yep", "yeah", "agree", "i agree", "ok", "okay"].includes(body.trim().toLowerCase());
}

function yesNo(body: string): boolean | null {
  const intent = classifyInbound(body);
  return intent === "yes" ? true : intent === "no" ? false : null;
}

// ---------------------------------------------------------------- signing up

async function begin(user: UserRow, now: Date): Promise<void> {
  if (user.age_gate_failed_at) {
    await textPerson(user, "onboarding", texts.under18());
    return;
  }
  const e = await liveEnrollment(user.id);
  if (e) {
    await sendStatus(e, now);
    return;
  }
  await setConvo(user, "ob_habit", {});
  await textPerson(user, "onboarding", texts.intro());
}

/** After the habit is settled, ask whatever comes next. */
async function askNext(user: UserRow, data: Onboarding): Promise<void> {
  const screens = TEXT_SCREENING[data.habit ?? ""] ?? [];
  const index = data.screenIndex ?? 0;
  if (index < screens.length) {
    await setConvo(user, "ob_screen", { ...data, screenIndex: index });
    await textPerson(user, "onboarding", screens[index].question);
    return;
  }
  if (!user.age_confirmed_at) {
    await setConvo(user, "ob_birth", data);
    await textPerson(user, "onboarding", texts.askBirthDateAndTime());
    return;
  }
  if (data.habit === "alcohol" && !user.over_21) {
    await setConvo(user, "ob_habit", {});
    await textPerson(user, "onboarding", texts.under21());
    return;
  }
  await setConvo(user, "ob_times", data);
  const note = data.note ? `${data.note} ` : "";
  await textPerson(user, "onboarding", `${note}${texts.askTimes()}`);
}

async function onboardHabit(user: UserRow, body: string): Promise<void> {
  const typed = body.trim();
  if (typed.length < 2) {
    await textPerson(user, "onboarding", texts.askHabitAgain());
    return;
  }
  const result = await checkCustomHabit(typed);
  if (result.outcome === "refer") {
    if (!result.helpline) {
      // Not something we can run a challenge for. Let them try again.
      await textPerson(user, "onboarding", texts.askHabitAgain());
      return;
    }
    // Needs a doctor or real support, not a text challenge. Signup stops here.
    await setConvo(user, null);
    await textPerson(user, "safety", texts.referral(result));
    return;
  }
  const habit = result.outcome === "map" ? result.slug : "other";
  if (HELD_HABITS.has(habit) || !getHabit(habit)) {
    await textPerson(user, "onboarding", texts.habitHeld());
    return;
  }
  await askNext(user, { habit, custom: result.outcome === "custom" ? result.label : null, screenIndex: 0 });
}

async function onboardScreen(user: UserRow, body: string): Promise<void> {
  const data = user.convo_data as Onboarding;
  const screen = (TEXT_SCREENING[data.habit ?? ""] ?? [])[data.screenIndex ?? 0];
  const answer = yesNo(body);
  if (!screen || answer === null) {
    await textPerson(user, "onboarding", texts.askAnswerYesNo());
    return;
  }
  if (answer && screen.referOnYes) {
    // Answers aren't stored. Signup stops here and nothing more is sent.
    await setConvo(user, null);
    await textPerson(user, "safety", texts.referral(screen.referOnYes));
    return;
  }
  await askNext(user, {
    ...data,
    screenIndex: (data.screenIndex ?? 0) + 1,
    note: answer && screen.noteOnYes ? screen.noteOnYes : data.note,
  });
}

async function onboardBirth(user: UserRow, body: string, now: Date): Promise<void> {
  const data = user.convo_data as Onboarding;
  const awaitingTimeOnly = user.convo_state === "ob_now";

  if (!awaitingTimeOnly) {
    const birth = parseBirthDate(body);
    if (!birth) {
      await textPerson(user, "onboarding", texts.askBirthDateAgain());
      return;
    }
    const age = ageOn(birth, now.toISOString().slice(0, 10));
    if (age < 18) {
      // Only the fact that the check failed is kept, never the birth date.
      await db().from("users").update({ age_gate_failed_at: now.toISOString(), convo_state: null, convo_data: {} }).eq("id", user.id);
      await textPerson(user, "onboarding", texts.under18());
      return;
    }
    const over21 = age >= 21;
    await db().from("users").update({ age_confirmed_at: now.toISOString(), over_21: over21 }).eq("id", user.id);
    user.age_confirmed_at = now.toISOString();
    user.over_21 = over21;
  }

  const zone = guessTimeZone(body, now, user.phone);
  if (!zone) {
    await setConvo(user, "ob_now", data);
    await textPerson(user, "onboarding", awaitingTimeOnly ? texts.askTimeNowAgain() : texts.askTimeNow());
    return;
  }
  await db().from("users").update({ timezone: zone }).eq("id", user.id);
  user.timezone = zone;
  await askNext(user, data);
}

async function onboardTimes(user: UserRow, body: string, now: Date): Promise<void> {
  const data = user.convo_data as Onboarding;
  const pair = parseTimePair(body);
  if (!pair) {
    await textPerson(user, "onboarding", texts.askTimesAgain());
    return;
  }
  const today = localNow(now, user.timezone).date;
  const earliest = defaultStartDate(today, launchDate());
  const asked = parseStartDate(body, today);
  const startDate =
    asked && diffDays(asked, earliest) >= 0 && diffDays(asked, today) <= MAX_START_DAYS_AHEAD ? asked : earliest;

  await setConvo(user, "ob_consent", { ...data, ...pair, startDate });
  await textPerson(user, "onboarding", texts.consent({
    morning: pair.morning,
    evening: pair.evening,
    startLabel: startLabel(startDate, addDays(today, 1)),
    free: !user.trial_used_at,
  }));
}

async function onboardConsent(user: UserRow, body: string, now: Date): Promise<void> {
  const data = user.convo_data as Onboarding;
  if (!isYes(body) || !data.habit || data.morning == null || data.evening == null || !data.startDate) {
    await textPerson(user, "onboarding", texts.consentAgain());
    return;
  }
  const free = !user.trial_used_at;
  const today = localNow(now, user.timezone).date;
  const supabase = db();

  await supabase.from("enrollments").delete().eq("user_id", user.id).eq("status", "pending_payment");
  const { data: rows, error } = await supabase
    .from("enrollments")
    .insert({
      user_id: user.id,
      habit_slug: data.habit,
      custom_habit: data.habit === "other" ? data.custom ?? "a habit" : null,
      start_date: data.startDate,
      status: free ? "scheduled" : "pending_payment",
      trial_ends_on: free ? addDays(data.startDate, FREE_DAYS - 1) : null,
    })
    .select(ENROLLMENT_SELECT);
  if (error || !rows?.[0]) throw new Error(`Could not create enrollment: ${error?.message}`);

  const update = {
    sms_consent_at: now.toISOString(),
    morning_time: minutesToTime(data.morning),
    evening_time: minutesToTime(data.evening),
    convo_state: null,
    convo_data: {},
    ...(free ? { trial_used_at: now.toISOString() } : {}),
  };
  await supabase.from("users").update(update).eq("id", user.id);

  const e = rows[0] as EnrollmentRow;
  if (free) {
    await textUser(e, "welcome", texts.welcome({
      startLabel: startLabel(data.startDate, addDays(today, 1)),
      morning: data.morning,
    }));
  } else {
    await textUser(e, "pay", texts.payFirst({ payUrl: payUrl(e) }));
  }
}

// ---------------------------------------------------------------- command words

async function sendStatus(e: EnrollmentRow, now: Date): Promise<void> {
  const local = localNow(now, e.users.timezone);
  const day = effectiveDay(e, local.date);
  if (e.status === "paused") {
    await textUser(e, "command", pausedText(e));
    return;
  }
  if (day < 1) {
    await textUser(e, "command", texts.notStarted({
      startLabel: startLabel(e.start_date, addDays(local.date, 1)),
      morning: timeToMinutes(e.users.morning_time),
    }));
    return;
  }
  const counts = await countCheckIns(e.id);
  await textUser(e, "command", texts.stats({ day: Math.min(day, CHALLENGE_DAYS), ...counts }));
}

function pausedText(e: EnrollmentRow): string {
  const day = e.paused_day ?? 1;
  return e.pause_reason === "unpaid" ? texts.payReminder({ payUrl: payUrl(e), day }) : texts.pausedNotice({ day });
}

async function recordCheckIn(e: EnrollmentRow, date: string, won: boolean): Promise<void> {
  const day = effectiveDay(e, date);
  const { error } = await db()
    .from("check_ins")
    .upsert({ enrollment_id: e.id, day: date, won, day_number: day }, { onConflict: "enrollment_id,day" });
  if (error) throw new Error(`Could not save check-in: ${error.message}`);

  const counts = await countCheckIns(e.id);
  if (won) {
    await textUser(e, "checkin_reply", texts.win({ won: counts.won, day }));
    return;
  }
  await textUser(e, "checkin_reply", texts.loss({ won: counts.won, day }));
  if (activePartner(e) && (await claim(e.id, "partner_alert", date))) {
    await textPartner(e, "partner_alert", texts.partnerMissed({ firstName: displayName(e.users) }));
  }
}

/** The day a Y or N answers: the last evening check-in we asked, if it's still unanswered. */
async function openCheckInDate(e: EnrollmentRow, localDate: string): Promise<string | null> {
  const { data } = await db()
    .from("scheduled_sends")
    .select("send_date")
    .eq("enrollment_id", e.id)
    .eq("kind", "evening")
    .order("send_date", { ascending: false })
    .limit(1);
  const lastAsked = data?.[0]?.send_date as string | undefined;
  if (!lastAsked || diffDays(localDate, lastAsked) > 1) return null;
  const { count } = await db()
    .from("check_ins")
    .select("id", { count: "exact", head: true })
    .eq("enrollment_id", e.id)
    .eq("day", lastAsked);
  return (count ?? 0) === 0 ? lastAsked : null;
}

async function partnerCommand(e: EnrollmentRow, arg: string): Promise<void> {
  const supabase = db();
  if (arg === "off" || arg === "remove") {
    await supabase.from("partners").delete().eq("enrollment_id", e.id);
    await textUser(e, "command", texts.partnerRemoved());
    return;
  }
  if (!e.users.first_name) {
    await setConvo(e.users, "partner_name", {});
    await textUser(e, "command", texts.askFirstName());
    return;
  }
  const number = smsNumber();
  if (!number) {
    await textUser(e, "command", texts.partnerNoNumber());
    return;
  }
  let code = partnerOf(e)?.invite_code ?? null;
  if (!code || partnerOf(e)?.consented_at) {
    await supabase.from("partners").delete().eq("enrollment_id", e.id);
    for (let attempt = 0; attempt < 5 && (attempt === 0 || !code); attempt += 1) {
      const candidate = String(Math.floor(10000 + Math.random() * 90000));
      const { error } = await supabase.from("partners").insert({ enrollment_id: e.id, invite_code: candidate });
      code = error ? null : candidate;
    }
    if (!code) throw new Error("Could not create a partner code.");
  }
  await textUser(e, "command", texts.partnerHowTo());
  await textUser(e, "partner_invite", texts.partnerForward({ code, number: number.display }));
}

/** Someone texted "PARTNER 12345" from their own phone. That text is their consent. */
async function acceptPartner(sender: UserRow, code: string, now: Date): Promise<void> {
  const supabase = db();
  const { data } = await supabase.from("partners").select("*").eq("invite_code", code).limit(1);
  const partner = data?.[0] as PartnerRow | undefined;
  if (!partner || partner.consented_at) {
    await textPerson(sender, "system", texts.partnerCodeUnknown());
    return;
  }
  const { data: rows } = await supabase.from("enrollments").select(ENROLLMENT_SELECT).eq("id", partner.enrollment_id).limit(1);
  const e = rows?.[0] as EnrollmentRow | undefined;
  if (!e) {
    await textPerson(sender, "system", texts.partnerCodeUnknown());
    return;
  }
  if (e.users.phone === sender.phone) {
    await textPerson(sender, "system", texts.partnerOwnPhone());
    return;
  }
  await supabase.from("partners").update({ phone: sender.phone, consented_at: now.toISOString(), opted_out_at: null }).eq("id", partner.id);
  const sid = await sendSms(sender.phone, texts.partnerWelcome({ firstName: displayName(e.users) }));
  await logMessage({ partnerId: partner.id, enrollmentId: e.id, direction: "out", kind: "partner_invite", body: "partner welcome", sid });
  await textUser(e, "system", texts.partnerJoined());
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
    await textUser(e, "coach", texts.coachUnavailable());
    return;
  }

  const { data: recent } = await db()
    .from("messages")
    .select("id, direction, body")
    .eq("user_id", e.user_id)
    .neq("id", inboundId)
    .neq("body", "")
    .order("created_at", { ascending: false })
    .limit(COACH_HISTORY);
  const history = (recent ?? []).reverse().map((m) => ({ direction: m.direction as "in" | "out", body: m.body as string }));

  const local = localNow(now, e.users.timezone);
  try {
    const reply = await coachReply({
      firstName: e.users.first_name?.trim() || "this person",
      habit: habitPhrase(e, getHabit(e.habit_slug)?.phrase),
      day: Math.min(effectiveDay(e, local.date), CHALLENGE_DAYS),
      daysWon: (await countCheckIns(e.id)).won,
      history,
      message: body,
    });
    await textUser(e, "coach", reply);
  } catch (err) {
    console.error("coach failed", { enrollmentId: e.id, message: err instanceof Error ? err.message : err });
    await textUser(e, "coach", texts.coachUnavailable());
  }
}

async function runCommand(e: EnrollmentRow, command: Command, now: Date): Promise<void> {
  const local = localNow(now, e.users.timezone);
  const day = effectiveDay(e, local.date);
  const morning = timeToMinutes(e.users.morning_time);

  switch (command.name) {
    case "urge": {
      const { count } = await db().from("messages").select("id", { count: "exact", head: true })
        .eq("user_id", e.user_id).eq("kind", "command").eq("direction", "out");
      await textUser(e, "command", texts.urge(count ?? 0));
      return;
    }
    case "stats":
    case "begin":
      await sendStatus(e, now);
      return;
    case "menu":
      await textUser(e, "command", texts.menu());
      return;
    case "time": {
      const pair = parseTimePair(command.arg);
      if (!pair) {
        await textUser(e, "command", texts.timeHelp());
        return;
      }
      await db().from("users").update({ morning_time: minutesToTime(pair.morning), evening_time: minutesToTime(pair.evening) }).eq("id", e.user_id);
      await textUser(e, "command", texts.timeSet(pair));
      return;
    }
    case "partner":
      await partnerCommand(e, command.arg);
      return;
    case "resume": {
      if (e.status !== "paused") {
        await textUser(e, "command", texts.notPaused());
        return;
      }
      if (e.pause_reason === "unpaid") {
        await textUser(e, "pay", pausedText(e));
        return;
      }
      const next = await resumeEnrollment(e, local.date);
      await textUser(e, "command", texts.resumed({ day: next, morning }));
      return;
    }
    case "pause": {
      if (e.status === "paused") {
        await textUser(e, "command", pausedText(e));
        return;
      }
      if (day < 1 || day > CHALLENGE_DAYS) {
        await sendStatus(e, now);
        return;
      }
      // Today counts as done, so they come back on the next day.
      await pauseEnrollment(e, "user", local.date, Math.min(day + 1, CHALLENGE_DAYS));
      await textUser(e, "command", texts.paused({ day: Math.min(day + 1, CHALLENGE_DAYS) }));
      return;
    }
    case "slip":
      if (e.status === "active" && day >= 1 && day <= CHALLENGE_DAYS) {
        await recordCheckIn(e, local.date, false);
      } else {
        await sendStatus(e, now);
      }
      return;
    case "commit":
      if (e.status !== "paused" && day >= 1 && day <= CHALLENGE_DAYS && (await claim(e.id, "commit", local.date))) {
        await textUser(e, "command", texts.commitAck());
      }
      return;
    case "delete":
      return; // handled before we get here
  }
}

// ---------------------------------------------------------------- entry point

export async function handleInbound(from: string, body: string, sid: string, now: Date = new Date()): Promise<void> {
  if (!/^\+1\d{10}$/.test(from)) return; // US numbers only

  const user = await getOrCreateUser(from);
  const logged = await logMessage({ userId: user.id, direction: "in", kind: "inbound", body, sid });
  if (!logged) return; // Twilio retried a text we already handled

  // 1. Carrier keywords. Twilio sends the confirmation; we keep our own record.
  const intent = classifyInbound(body);
  if (intent === "stop") {
    await optOut(user, now);
    return;
  }
  if (intent === "start") {
    await db().from("users").update({ sms_opted_out_at: null }).eq("id", user.id);
    return;
  }
  if (intent === "help") return;

  // 2. Opting out in their own words.
  if (detectOptOutIntent(body)) {
    const sidOut = await sendSms(user.phone, texts.optedOut());
    await logMessage({ userId: user.id, direction: "out", kind: "system", body: texts.optedOut(), sid: sidOut });
    await optOut(user, now);
    return;
  }
  if (user.sms_opted_out_at) return;

  // 3. Crisis or medical wording gets a fixed reply and goes no further.
  const flag = detectSafetyFlag(body);
  if (flag) {
    await textPerson(user, "safety", flag === "crisis" ? texts.safetyCrisis() : texts.safetyMedical());
    return;
  }

  const command = parseCommand(body);

  // 4. A partner joining with their code.
  if (command?.name === "partner" && /^\d{5}$/.test(command.arg)) {
    await acceptPartner(user, command.arg, now);
    return;
  }

  // 5. Erasing their data works from any state.
  if (command?.name === "delete") {
    if (user.convo_state === "confirm_delete") {
      await sendSms(user.phone, texts.deleted());
      await db().from("partners").delete().eq("phone", user.phone);
      await db().from("users").delete().eq("id", user.id);
    } else {
      await setConvo(user, "confirm_delete", user.convo_data as Onboarding);
      await textPerson(user, "command", texts.deleteConfirm());
    }
    return;
  }
  if (user.convo_state === "confirm_delete") await setConvo(user, null);

  // 6. Signing up.
  if (command?.name === "begin") {
    await begin(user, now);
    return;
  }
  switch (user.convo_state) {
    case "ob_habit": return onboardHabit(user, body);
    case "ob_screen": return onboardScreen(user, body);
    case "ob_birth":
    case "ob_now": return onboardBirth(user, body, now);
    case "ob_times": return onboardTimes(user, body, now);
    case "ob_consent": return onboardConsent(user, body, now);
  }

  const e = await liveEnrollment(user.id);

  if (!e) {
    if (await sentSystemTextRecently(user.id, now)) return;
    const { count } = await db().from("partners").select("id", { count: "exact", head: true })
      .eq("phone", user.phone).not("consented_at", "is", null).is("opted_out_at", null);
    await textPerson(user, "system", (count ?? 0) > 0 ? texts.partnerNote() : texts.explainer());
    return;
  }

  // 7. Giving a first name so a partner invite can be made.
  if (user.convo_state === "partner_name" && !command) {
    const name = body.trim().split(/\s+/)[0].replace(/[^A-Za-z'-]/g, "").slice(0, 30);
    if (!name) {
      await textUser(e, "command", texts.askFirstName());
      return;
    }
    await db().from("users").update({ first_name: name, convo_state: null }).eq("id", user.id);
    e.users.first_name = name;
    e.users.convo_state = null;
    await partnerCommand(e, "");
    return;
  }

  // 8. Command words.
  if (command) {
    if (e.status === "paused" && !["resume", "stats", "begin", "menu", "urge", "pause"].includes(command.name)) {
      await textUser(e, "command", pausedText(e));
      return;
    }
    await runCommand(e, command, now);
    return;
  }

  if (e.status === "paused") {
    if (!(await sentSystemTextRecently(user.id, now))) await textUser(e, "system", pausedText(e));
    return;
  }

  // 9. Y or N answers the evening check-in, if one is waiting.
  if (intent === "yes" || intent === "no") {
    const date = await openCheckInDate(e, localNow(now, e.users.timezone).date);
    if (date) {
      await recordCheckIn(e, date, intent === "yes");
      return;
    }
  }

  // 10. Anything else goes to the coach.
  await coach(e, body, logged.id, now);
}

async function optOut(user: UserRow, now: Date): Promise<void> {
  const at = now.toISOString();
  await db().from("users").update({ sms_opted_out_at: at, convo_state: null, convo_data: {} }).eq("id", user.id);
  await db().from("partners").update({ opted_out_at: at }).eq("phone", user.phone);
}
