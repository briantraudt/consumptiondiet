// Whole conversations, run against an in-memory database with texting and the AI coach faked.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "./fake-db";

const state = vi.hoisted(() => ({
  db: null as unknown as import("./fake-db").FakeDb,
  sent: [] as Array<{ to: string; body: string }>,
  coachSays: "Take a short walk and text me after." as string | Error,
}));

vi.mock("@/lib/db", () => ({ db: () => state.db }));
vi.mock("@/lib/twilio", () => ({
  sendSms: async (to: string, body: string) => {
    state.sent.push({ to, body });
    return `SM-out-${state.sent.length}`;
  },
}));
vi.mock("@/lib/coach", () => ({
  coachReply: async () => {
    if (state.coachSays instanceof Error) throw state.coachSays;
    return state.coachSays;
  },
}));
vi.mock("@/lib/custom-habit", async () => {
  const { classifyCustomHabit } = await import("@/lib/habits");
  return { checkCustomHabit: async (text: string) => classifyCustomHabit(text) };
});

import { handleInbound } from "@/lib/conversation";
import { recordPayment, runTick } from "@/lib/engine";
import { namesSensitiveHabit } from "@/lib/parse";
import { webSignup, WEB_TEXTS_PER_HOUR } from "@/lib/web-signup";

const ME = "+15125550101";
const FRIEND = "+15125550202";
let sidCounter = 0;

/** Central time on a date in January 2027 (UTC-6). */
function at(date: string, time: string): Date {
  return new Date(`${date}T${time}:00-06:00`);
}

async function text(from: string, body: string, when: Date): Promise<string[]> {
  state.db.now = when;
  const before = state.sent.length;
  sidCounter += 1;
  await handleInbound(from, body, `SM-in-${sidCounter}`, when);
  return state.sent.slice(before).filter((m) => m.to === from).map((m) => m.body);
}

async function tick(when: Date): Promise<string[]> {
  state.db.now = when;
  const before = state.sent.length;
  const summary = await runTick(when);
  expect(summary.errors).toEqual([]);
  return state.sent.slice(before).map((m) => `${m.to === ME ? "me" : "friend"}: ${m.body}`);
}

function enrollment() {
  return state.db.tables.enrollments[0] as Record<string, unknown>;
}

/** Sign up on Dec 31 for a Jan 1 start, texts at 7am and 8pm Central. */
async function signUp(habit = "sugar"): Promise<void> {
  const t = at("2026-12-31", "14:15");
  await text(ME, "BEGIN", t);
  await text(ME, habit, t);
  await text(ME, "04/12/1988 2:15pm", t);
  await text(ME, "7am 8pm", t);
  await text(ME, "YES", t);
}

beforeEach(() => {
  state.db = new FakeDb();
  state.sent = [];
  state.coachSays = "Take a short walk and text me after.";
  process.env.TWILIO_FROM_NUMBER = "+15125550100";
  process.env.TWILIO_ACCOUNT_SID = "AC-test";
  process.env.TWILIO_AUTH_TOKEN = "test-token";
  process.env.APP_URL = "https://www.consumptiondiet.com";
  delete process.env.LAUNCH_DATE;
});

describe("signing up by text", () => {
  it("enrolls someone in five replies with a free week", async () => {
    const t = at("2026-12-31", "14:15");
    expect((await text(ME, "BEGIN", t))[0]).toContain("What's the one habit you want to quit?");
    expect((await text(ME, "sugar", t))[0]).toContain("date of birth");
    expect((await text(ME, "04/12/1988 2:15pm", t))[0]).toContain("When do you want your texts?");
    const consent = (await text(ME, "7am 8pm", t))[0];
    expect(consent).toContain("Morning text 7:00 AM, check-in 8:00 PM, starting tomorrow");
    expect(consent).toContain("First 7 days free");
    expect(state.db.tables.enrollments).toHaveLength(0);

    const welcome = (await text(ME, "YES", t))[0];
    expect(welcome).toContain("You're in. Day 1 comes tomorrow at 7:00 AM");
    expect(enrollment()).toMatchObject({
      habit_slug: "sugar", status: "scheduled", start_date: "2027-01-01", trial_ends_on: "2027-01-07", paid_at: null,
    });
    expect(state.db.tables.users[0]).toMatchObject({
      timezone: "America/Chicago", morning_time: "07:00", evening_time: "20:00", over_21: true, convo_state: null,
    });
    expect(state.db.tables.users[0].sms_consent_at).toBeTruthy();
  });

  it("sends nothing recurring until they say YES", async () => {
    const t = at("2026-12-31", "14:15");
    await text(ME, "BEGIN", t);
    await text(ME, "sugar", t);
    await text(ME, "04/12/1988 2:15pm", t);
    await text(ME, "7am 8pm", t);
    expect((await text(ME, "maybe later", t))[0]).toContain("Reply YES to start");
    expect(await tick(at("2027-01-01", "07:00"))).toEqual([]);
  });

  it("asks for the current time separately when it's missing", async () => {
    const t = at("2026-12-31", "14:15");
    await text(ME, "BEGIN", t);
    await text(ME, "junk food", t);
    expect((await text(ME, "04/12/1988", t))[0]).toContain("What time is it for you right now?");
    expect((await text(ME, "2:15pm", t))[0]).toContain("When do you want your texts?");
  });

  it("keeps a typed habit that isn't one of ours, without repeating it back", async () => {
    const t = at("2026-12-31", "14:15");
    await text(ME, "BEGIN", t);
    const reply = (await text(ME, "biting my nails", t))[0];
    expect(reply).not.toContain("nails");
    await text(ME, "04/12/1988 2:15pm", t);
    await text(ME, "7am 8pm", t);
    await text(ME, "YES", t);
    expect(enrollment()).toMatchObject({ habit_slug: "other", custom_habit: "biting my nails" });
  });

  it("lets them pick a later start date", async () => {
    const t = at("2026-12-31", "14:15");
    await text(ME, "BEGIN", t);
    await text(ME, "sugar", t);
    await text(ME, "04/12/1988 2:15pm", t);
    expect((await text(ME, "6:30am 9pm 1/5", t))[0]).toContain("starting January 5");
    await text(ME, "yes", t);
    expect(enrollment()).toMatchObject({ start_date: "2027-01-05", trial_ends_on: "2027-01-11" });
    expect(state.db.tables.users[0]).toMatchObject({ morning_time: "06:30", evening_time: "21:00" });
  });

  it("turns away anyone under 18 and keeps turning them away", async () => {
    const t = at("2026-12-31", "14:15");
    await text(ME, "BEGIN", t);
    await text(ME, "sugar", t);
    expect((await text(ME, "06/01/2012 2:15pm", t))[0]).toContain("18 and over");
    expect((await text(ME, "BEGIN", t))[0]).toContain("18 and over");
    expect(state.db.tables.enrollments).toHaveLength(0);
  });

  it("refers someone whose body may depend on alcohol and stops there", async () => {
    const t = at("2026-12-31", "14:15");
    await text(ME, "BEGIN", t);
    expect((await text(ME, "drinking", t))[0]).toContain("Quick safety check");
    const referral = (await text(ME, "Y", t))[0];
    expect(referral).toContain("talk to a doctor");
    expect(referral).toContain("1-800-662-4357");
    expect(state.db.tables.users[0].convo_state).toBeNull();
    expect(state.db.tables.enrollments).toHaveLength(0);
  });

  it("requires 21 for the alcohol challenge", async () => {
    const t = at("2026-12-31", "14:15");
    await text(ME, "BEGIN", t);
    await text(ME, "alcohol", t);
    await text(ME, "N", t);
    expect((await text(ME, "06/01/2007 2:15pm", t))[0]).toContain("21 and over");
    expect((await text(ME, "sugar", t))[0]).toContain("When do you want your texts?");
  });

  it("holds weed back and refers hard drugs to a doctor", async () => {
    const t = at("2026-12-31", "14:15");
    await text(ME, "BEGIN", t);
    expect((await text(ME, "weed", t))[0]).toContain("not running that challenge yet");
    expect((await text(ME, "oxycodone", t))[0]).toContain("doctor");
    expect(state.db.tables.enrollments).toHaveLength(0);
  });

  it("asks a returning person to pay before a second challenge starts", async () => {
    await signUp();
    enrollment().status = "completed";
    const t = at("2027-02-10", "14:15");
    await text(ME, "BEGIN", t);
    await text(ME, "shopping", t);
    expect((await text(ME, "7am 8pm", t))[0]).toContain("30 days is $31");
    const reply = (await text(ME, "YES", t))[0];
    expect(reply).toContain("/pay/");
    const second = state.db.tables.enrollments[1];
    expect(second).toMatchObject({ status: "pending_payment", trial_ends_on: null });

    await recordPayment(second.id as string, null, at("2027-02-12", "09:00"));
    expect(second).toMatchObject({ status: "scheduled", start_date: "2027-02-13" });
  });
});

describe("the daily loop", () => {
  beforeEach(() => signUp());

  it("sends the morning prompt once, at the chosen time", async () => {
    expect(await tick(at("2027-01-01", "06:45"))).toEqual([]);
    const morning = await tick(at("2027-01-01", "07:00"));
    expect(morning).toEqual(["me: Day 1/30: Do the day 1 thing for this habit. Reply 1 if you're in."]);
    expect(await tick(at("2027-01-01", "07:15"))).toEqual([]);
    expect(enrollment().status).toBe("active");
  });

  it("acknowledges the morning commitment once", async () => {
    await tick(at("2027-01-01", "07:00"));
    expect(await text(ME, "1", at("2027-01-01", "07:05"))).toEqual(["Locked in. Text URGE if it gets hard today."]);
    expect(await text(ME, "1", at("2027-01-01", "07:06"))).toEqual([]);
  });

  it("records a win and a slip without resetting anything", async () => {
    await tick(at("2027-01-01", "20:00"));
    expect(await text(ME, "Y", at("2027-01-01", "20:05"))).toEqual(["Day won. That's 1 of 1. See you in the morning."]);
    await tick(at("2027-01-02", "20:00"));
    const loss = (await text(ME, "n", at("2027-01-02", "20:30")))[0];
    expect(loss).toContain("One day doesn't erase 1 win.");
    expect(loss).toContain("Tomorrow is day 3");
    expect(state.db.tables.check_ins.map((c) => [c.day_number, c.won])).toEqual([[1, true], [2, false]]);
  });

  it("counts a late-night answer for the day it was asked about", async () => {
    await tick(at("2027-01-01", "20:00"));
    await text(ME, "yes", at("2027-01-02", "00:20"));
    expect(state.db.tables.check_ins[0]).toMatchObject({ day: "2027-01-01", day_number: 1, won: true });
  });

  it("sends Y to the coach when no check-in is waiting", async () => {
    expect(await text(ME, "Y", at("2027-01-01", "10:00"))).toEqual(["Take a short walk and text me after."]);
    expect(state.db.tables.check_ins).toHaveLength(0);
  });

  it("answers URGE with a fixed plan and everything else with the coach", async () => {
    expect((await text(ME, "URGE", at("2027-01-01", "15:00")))[0]).toContain("10-minute timer");
    expect(await text(ME, "rough day at work", at("2027-01-01", "15:05"))).toEqual(["Take a short walk and text me after."]);
  });

  it("falls back to a fixed reply when the coach fails or names the habit", async () => {
    state.coachSays = new Error("Coach reply named a habit.");
    expect((await text(ME, "this is hard", at("2027-01-01", "15:00")))[0]).toContain("I can't reply right now");
  });

  it("logs a slip any time with SLIP, and shows progress with STATS", async () => {
    await tick(at("2027-01-01", "07:00"));
    expect((await text(ME, "slip", at("2027-01-01", "13:00")))[0]).toContain("Logged.");
    expect(await text(ME, "STATS", at("2027-01-01", "13:05"))).toEqual(["Day 1 of 30. 0 won, 1 slipped. You're still in it."]);
  });

  it("changes text times with TIME", async () => {
    expect(await text(ME, "TIME 6am 9:30pm", at("2027-01-01", "12:00"))).toEqual([
      "Done. Morning text at 6:00 AM, check-in at 9:30 PM.",
    ]);
    expect(await tick(at("2027-01-02", "06:00"))).toHaveLength(1);
  });

  it("routes crisis wording to 988 and never to the coach", async () => {
    const reply = (await text(ME, "honestly I want to kill myself", at("2027-01-01", "23:00")))[0];
    expect(reply).toContain("988");
    expect(reply).not.toContain("walk");
  });

  it("sends the Sunday review and the day-31 wrap-up", async () => {
    await tick(at("2027-01-01", "20:00"));
    await text(ME, "Y", at("2027-01-01", "20:05"));
    await tick(at("2027-01-02", "20:00"));
    await text(ME, "Y", at("2027-01-02", "20:05"));
    // January 3, 2027 is a Sunday.
    expect(await tick(at("2027-01-03", "16:00"))).toEqual([
      "me: Sunday review: 2 of 2 days won so far. That's real progress. Keep going.",
    ]);

    enrollment().paid_at = "2027-01-05T00:00:00Z";
    await text(ME, "still here", at("2027-01-30", "12:00"));
    const wrap = await tick(at("2027-01-31", "07:00"));
    expect(wrap[0]).toContain("30 days done. You won 2 of 30.");
    expect(enrollment().status).toBe("completed");
  });
});

describe("the free week and payment", () => {
  beforeEach(() => signUp());

  it("sends the payment link on the evening of day 7", async () => {
    await text(ME, "checking in", at("2027-01-07", "12:00"));
    const evening = await tick(at("2027-01-07", "20:00"));
    expect(evening).toHaveLength(2);
    expect(evening[0]).toContain("Day 7: Did you win today?");
    expect(evening[1]).toContain("That's your free week");
    expect(evening[1]).toContain("$31");
    expect(evening[1]).toContain(`/pay/${enrollment().result_token}`);
    expect(await tick(at("2027-01-07", "20:15"))).toEqual([]);
  });

  it("pauses on day 8 if unpaid, reminds once, and picks up after payment", async () => {
    await text(ME, "checking in", at("2027-01-07", "12:00"));
    await tick(at("2027-01-07", "20:00"));
    expect(await tick(at("2027-01-08", "00:15"))).toEqual([]);
    expect(enrollment()).toMatchObject({ status: "paused", pause_reason: "unpaid", paused_day: 8 });

    const reminder = await tick(at("2027-01-08", "07:00"));
    expect(reminder).toHaveLength(1);
    expect(reminder[0]).toContain("Your free week has ended");
    expect(await tick(at("2027-01-08", "07:15"))).toEqual([]);
    expect(await tick(at("2027-01-09", "07:00"))).toEqual([]);

    // They pay three days later. Day 8 comes the next morning.
    state.db.now = at("2027-01-11", "10:00");
    await recordPayment(enrollment().id as string, "cus_1", at("2027-01-11", "10:00"));
    expect(state.sent.at(-1)?.body).toBe("Payment received. Thank you. Day 8 comes tomorrow at 7:00 AM.");
    expect(enrollment()).toMatchObject({ status: "active", offset_days: 4 });
    expect(await tick(at("2027-01-11", "20:00"))).toEqual([]);
    expect((await tick(at("2027-01-12", "07:00")))[0]).toContain("Day 8/30");
  });

  it("keeps going without a gap when they pay during the free week", async () => {
    await recordPayment(enrollment().id as string, "cus_1", at("2027-01-05", "10:00"));
    expect(state.sent.at(-1)?.body).toBe("Payment received. Thank you. You're set through day 30.");
    await text(ME, "checking in", at("2027-01-07", "12:00"));
    expect(await tick(at("2027-01-07", "20:00"))).toHaveLength(1);
    expect((await tick(at("2027-01-08", "07:00")))[0]).toContain("Day 8/30");
  });

  it("records a payment only once", async () => {
    expect(await recordPayment(enrollment().id as string, "cus_1", at("2027-01-05", "10:00"))).toBe(true);
    expect(await recordPayment(enrollment().id as string, "cus_1", at("2027-01-05", "10:01"))).toBe(false);
  });
});

describe("pausing, silence and coming back", () => {
  beforeEach(() => signUp());

  it("pauses for a week and comes back on the next day number", async () => {
    await tick(at("2027-01-03", "07:00"));
    expect((await text(ME, "PAUSE", at("2027-01-03", "09:00")))[0]).toContain("Day 4 is saved");
    expect(await tick(at("2027-01-03", "20:00"))).toEqual([]);
    expect(await tick(at("2027-01-05", "07:00"))).toEqual([]);

    expect(await text(ME, "RESUME", at("2027-01-06", "18:00"))).toEqual(["Welcome back. Day 4 comes tomorrow at 7:00 AM."]);
    expect(await tick(at("2027-01-06", "20:00"))).toEqual([]);
    expect((await tick(at("2027-01-07", "07:00")))[0]).toContain("Day 4/30");
    // The free week moves with the pause instead of being used up by it.
    expect(enrollment().trial_ends_on).toBe("2027-01-10");
  });

  it("comes back by itself after 7 days off, and doesn't mistake the break for silence", async () => {
    await text(ME, "PAUSE", at("2027-01-03", "09:00"));
    const back = await tick(at("2027-01-09", "07:00"));
    expect(back).toEqual(["me: Welcome back. Day 4 comes tomorrow at 7:00 AM."]);
    expect((await tick(at("2027-01-10", "07:00")))[0]).toContain("Day 4/30");
  });

  it("notes one missed day, softens after three, and pauses after seven", async () => {
    enrollment().paid_at = "2027-01-01T00:00:00Z";
    await text(ME, "here", at("2027-01-01", "12:00"));
    expect((await tick(at("2027-01-02", "07:00")))[0]).not.toContain("Missed you");
    expect((await tick(at("2027-01-03", "07:00")))[0]).toContain("Missed you last night.");
    expect((await tick(at("2027-01-04", "20:00")))[0]).toContain("Did you win today?");
    expect((await tick(at("2027-01-05", "20:00")))[0]).toContain("No judgment either way");

    const paused = await tick(at("2027-01-09", "07:00"));
    expect(paused).toHaveLength(1);
    expect(paused[0]).toContain("I've paused your texts. Day 9 is saved.");
    expect(await tick(at("2027-01-10", "07:00"))).toEqual([]);

    expect(await text(ME, "resume", at("2027-01-20", "12:00"))).toEqual(["Welcome back. Day 9 comes tomorrow at 7:00 AM."]);
    expect((await tick(at("2027-01-21", "07:00")))[0]).toContain("Day 9/30");
  });
});

describe("accountability partner", () => {
  beforeEach(() => signUp());

  it("invites by a forwarded code, and the partner opts in from their own phone", async () => {
    const t = at("2027-01-01", "12:00");
    expect(await text(ME, "PARTNER", t)).toEqual(["What's your first name? Your partner will see it so they know who it's from."]);
    const invite = await text(ME, "Sam", t);
    expect(invite).toHaveLength(2);
    const code = invite[1].match(/PARTNER (\d{5})/)?.[1] as string;
    expect(invite[1]).toContain("to (512) 555-0100");
    // Nothing is ever sent to the friend until they text in themselves.
    expect(state.sent.filter((m) => m.to === FRIEND)).toHaveLength(0);

    expect(await text(ME, `PARTNER ${code}`, t)).toEqual([
      "That code is for your partner. Forward the invite so they can text it from their own phone.",
    ]);
    const joined = await text(FRIEND, `partner ${code}`, t);
    expect(joined[0]).toContain("you're now Sam's accountability partner");
    expect(joined[0]).toContain("Reply STOP to cancel");
    expect(state.sent.at(-1)).toEqual({ to: ME, body: "Your partner is in. They'll hear from me if you miss a day, and on Sundays." });

    await tick(at("2027-01-01", "20:00"));
    await text(ME, "N", at("2027-01-01", "20:10"));
    expect(state.sent.filter((m) => m.to === FRIEND).at(-1)?.body).toBe(
      "Sam had a hard day in their 30-day challenge. A quick text from you would help.",
    );
  });

  it("stops texting a partner who opts out", async () => {
    const t = at("2027-01-01", "12:00");
    await text(ME, "PARTNER", t);
    const code = (await text(ME, "Sam", t))[1].match(/PARTNER (\d{5})/)?.[1] as string;
    await text(FRIEND, `PARTNER ${code}`, t);
    await text(FRIEND, "STOP", t);
    const before = state.sent.filter((m) => m.to === FRIEND).length;
    await tick(at("2027-01-01", "20:00"));
    await text(ME, "N", at("2027-01-01", "20:10"));
    expect(state.sent.filter((m) => m.to === FRIEND)).toHaveLength(before);
  });

  it("rejects a code that doesn't exist", async () => {
    expect(await text(FRIEND, "PARTNER 00000", at("2027-01-01", "12:00"))).toEqual([
      "That partner code didn't match. Ask them to send you a new one.",
    ]);
  });
});

describe("opting out and deleting", () => {
  beforeEach(() => signUp());

  it("treats a plain-words request as STOP", async () => {
    expect(await text(ME, "please stop texting me", at("2027-01-01", "12:00"))).toEqual([
      "You're unsubscribed from Consumption Diet and won't get more messages. Reply START to rejoin.",
    ]);
    expect(await tick(at("2027-01-02", "07:00"))).toEqual([]);
    expect(await text(ME, "hello?", at("2027-01-02", "08:00"))).toEqual([]);
  });

  it("stops everything on STOP and starts again on START", async () => {
    expect(await text(ME, "STOP", at("2027-01-01", "12:00"))).toEqual([]);
    expect(await tick(at("2027-01-02", "07:00"))).toEqual([]);
    await text(ME, "START", at("2027-01-02", "12:00"));
    expect(await tick(at("2027-01-03", "07:00"))).toHaveLength(1);
  });

  it("erases everything after DELETE is confirmed", async () => {
    await text(ME, "some private thing", at("2027-01-01", "12:00"));
    expect((await text(ME, "DELETE", at("2027-01-01", "12:01")))[0]).toContain("Reply DELETE again to confirm");
    expect((await text(ME, "delete", at("2027-01-01", "12:02")))[0]).toContain("Your data is erased");
    expect(state.db.tables.users).toHaveLength(0);
    expect(state.db.tables.enrollments).toHaveLength(0);
    expect(state.db.tables.messages).toHaveLength(0);
  });

  it("erases message text after 90 days", async () => {
    await text(ME, "something personal", at("2027-01-01", "12:00"));
    enrollment().status = "completed";
    await tick(at("2027-04-05", "12:00"));
    expect(state.db.tables.messages.every((m) => m.body === "")).toBe(true);
  });
});

describe("people we don't know", () => {
  it("explains itself once a day to a stranger", async () => {
    expect((await text(FRIEND, "who is this", at("2027-01-01", "12:00")))[0]).toContain("Text BEGIN to start");
    expect(await text(FRIEND, "??", at("2027-01-01", "12:01"))).toEqual([]);
  });

  it("ignores numbers outside the US", async () => {
    expect(await text("+447700900123", "BEGIN", at("2027-01-01", "12:00"))).toEqual([]);
    expect(state.db.tables.users).toHaveLength(0);
  });

  it("handles a retried webhook once", async () => {
    state.db.now = at("2027-01-01", "12:00");
    await handleInbound(FRIEND, "BEGIN", "SM-same", state.db.now);
    await handleInbound(FRIEND, "BEGIN", "SM-same", state.db.now);
    expect(state.sent).toHaveLength(1);
  });
});

describe("nothing we send names a habit", () => {
  it("holds across a whole alcohol signup and first week", async () => {
    const t = at("2026-12-31", "14:15");
    await text(ME, "BEGIN", t);
    await text(ME, "alcohol", t);
    await text(ME, "N", t);
    await text(ME, "04/12/1988 2:15pm", t);
    await text(ME, "7am 8pm", t);
    await text(ME, "YES", t);
    for (let day = 1; day <= 8; day += 1) {
      const date = `2027-01-0${day}`;
      await tick(at(date, "07:00"));
      await text(ME, "1", at(date, "07:05"));
      await tick(at(date, "20:00"));
      await text(ME, day % 2 ? "Y" : "N", at(date, "20:05"));
    }
    expect(state.sent.length).toBeGreaterThan(30);
    for (const message of state.sent) {
      expect(namesSensitiveHabit(message.body), message.body).toBe(false);
    }
  });
});

describe("signing up on the website", () => {
  const form = { firstName: "Sam", phone: "(512) 555-0101", habit: "sugar", consent: true };

  it("saves the person and texts them once, then finishes by text", async () => {
    const t = at("2026-12-31", "14:15");
    state.db.now = t;
    expect(await webSignup(form, t)).toEqual({ status: "texted" });
    expect(state.sent.map((m) => m.to)).toEqual([ME, ME]);
    expect(state.sent[0].body).toContain("Consumption Diet: Hi Sam, thanks for signing up.");
    expect(state.sent[0].body).toContain("Reply STOP to cancel");
    expect(state.sent[1].body).toContain("date of birth");

    await text(ME, "04/12/1988 2:15pm", t);
    await text(ME, "7am 8pm", t);
    await text(ME, "YES", t);
    expect(enrollment()).toMatchObject({ habit_slug: "sugar", status: "scheduled", start_date: "2027-01-01" });
    expect(state.db.tables.users[0]).toMatchObject({ first_name: "Sam", convo_state: null });
  });

  it("sends nothing more if the number never replies", async () => {
    const t = at("2026-12-31", "14:15");
    state.db.now = t;
    await webSignup(form, t);
    expect(await webSignup(form, at("2026-12-31", "14:20"))).toEqual({ status: "already_texted" });
    await tick(at("2027-01-01", "12:00"));
    await tick(at("2027-01-02", "12:00"));
    expect(state.sent).toHaveLength(2);
    expect(state.db.tables.enrollments).toHaveLength(0);
  });

  it("asks the safety question first for a habit that has one", async () => {
    const t = at("2026-12-31", "14:15");
    state.db.now = t;
    await webSignup({ ...form, habit: "alcohol" }, t);
    expect(state.sent[1].body).toContain("Quick safety check");
    for (const m of state.sent) expect(namesSensitiveHabit(m.body), m.body).toBe(false);
  });

  it("keeps people on a list until texting is switched on, then texts them during the day", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    const t = at("2026-12-01", "22:00");
    state.db.now = t;
    expect(await webSignup(form, t)).toEqual({ status: "waitlist" });
    expect(state.sent).toHaveLength(0);
    expect(state.db.tables.users[0]).toMatchObject({ first_name: "Sam", convo_state: "web_pending", convo_data: { habit: "sugar", custom: null } });

    process.env.TWILIO_ACCOUNT_SID = "AC-test";
    expect(await tick(at("2026-12-20", "07:00"))).toEqual([]); // too early in the day
    const sent = await tick(at("2026-12-20", "10:00"));
    expect(sent).toHaveLength(2);
    expect(sent[0]).toContain("Hi Sam, thanks for signing up.");
    expect(await tick(at("2026-12-20", "10:15"))).toEqual([]);
  });

  it("checks the form before saving anything", async () => {
    const t = at("2026-12-31", "14:15");
    state.db.now = t;
    expect(await webSignup({ ...form, firstName: " " }, t)).toMatchObject({ status: "invalid" });
    expect(await webSignup({ ...form, phone: "555-0101" }, t)).toMatchObject({ status: "invalid" });
    expect(await webSignup({ ...form, consent: false }, t)).toMatchObject({ status: "invalid" });
    expect(await webSignup({ ...form, habit: "weed" }, t)).toMatchObject({ status: "invalid" });
    expect(await webSignup({ ...form, habit: "other", customHabit: "weed" }, t)).toMatchObject({ status: "invalid" });
    expect(await webSignup({ ...form, habit: "other", customHabit: "oxycodone" }, t)).toMatchObject({ status: "referral" });
    expect(await webSignup({ ...form, website: "http://spam.example" }, t)).toEqual({ status: "waitlist" });
    expect(state.db.tables.users).toHaveLength(0);
    expect(state.sent).toHaveLength(0);
  });

  it("moves a typed habit onto the matching challenge, or keeps it as their own", async () => {
    const t = at("2026-12-31", "14:15");
    state.db.now = t;
    await webSignup({ ...form, habit: "other", customHabit: "TikTok" }, t);
    expect(state.db.tables.users[0].convo_data).toMatchObject({ habit: "social-media" });
    await webSignup({ ...form, phone: "512-555-0202", habit: "other", customHabit: "biting my nails" }, t);
    await text(FRIEND, "04/12/1988 2:15pm", t);
    await text(FRIEND, "7am 8pm", t);
    await text(FRIEND, "YES", t);
    expect(state.db.tables.enrollments[0]).toMatchObject({ habit_slug: "other", custom_habit: "biting my nails" });
  });

  it("won't text a number that opted out or already has a challenge", async () => {
    await signUp();
    const before = state.sent.length;
    expect(await webSignup(form, at("2027-01-01", "12:00"))).toEqual({ status: "already_enrolled" });
    await text(ME, "STOP", at("2027-01-01", "12:01"));
    enrollment().status = "canceled";
    expect(await webSignup(form, at("2027-01-01", "12:02"))).toMatchObject({ status: "invalid" });
    expect(state.sent).toHaveLength(before);
  });

  it("stops texting from the form once the hourly limit is reached", async () => {
    const t = at("2026-12-31", "14:15");
    state.db.now = t;
    for (let i = 0; i < WEB_TEXTS_PER_HOUR; i += 1) {
      state.db.tables.messages.push(state.db.newRow("messages", { direction: "out", kind: "onboarding", body: "x" }));
    }
    expect(await webSignup(form, t)).toEqual({ status: "waitlist" });
    expect(state.sent).toHaveLength(0);
  });

  it("uses the website answers if they text BEGIN before we text them", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    const t = at("2026-12-31", "14:15");
    state.db.now = t;
    await webSignup(form, t);
    process.env.TWILIO_ACCOUNT_SID = "AC-test";
    const replies = await text(ME, "BEGIN", t);
    expect(replies[0]).toContain("Hi Sam");
    expect(replies[1]).toContain("date of birth");
  });
});
