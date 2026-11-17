// The website form: first name, mobile number, and what they want to quit.
// It saves the person, then sends one text. Nothing more is sent unless they reply.

import { smsReady } from "./config";
import { liveEnrollment, type UserRow } from "./core";
import { checkCustomHabit } from "./custom-habit";
import { db } from "./db";
import { getHabit, HELD_HABITS } from "./habits";
import { normalizeUsPhone } from "./inbound";

/** A ceiling on first texts triggered by the form, so it can't be used to flood numbers. */
export const WEB_TEXTS_PER_HOUR = 60;

export type WebSignupInput = {
  firstName?: unknown;
  phone?: unknown;
  habit?: unknown;
  customHabit?: unknown;
  consent?: unknown;
  /** Hidden field. People leave it empty; bots fill it in. */
  website?: unknown;
};

export type WebSignupResult =
  | { status: "texted" | "waitlist" | "already_texted" | "already_enrolled" }
  | { status: "invalid"; message: string }
  | { status: "referral"; message: string; helpline: string };

export async function webTextsLastHour(now: Date): Promise<number> {
  const since = new Date(now.getTime() - 3_600_000).toISOString();
  const { count } = await db()
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("direction", "out")
    .eq("kind", "onboarding")
    .gte("created_at", since);
  return count ?? 0;
}

export async function webSignup(input: WebSignupInput, now: Date = new Date()): Promise<WebSignupResult> {
  if (typeof input.website === "string" && input.website.trim()) {
    return { status: "waitlist" }; // a bot; pretend it worked and save nothing
  }

  const firstName = typeof input.firstName === "string"
    ? input.firstName.trim().split(/\s+/)[0].replace(/[^\p{L}'-]/gu, "").slice(0, 20)
    : "";
  if (!firstName) return { status: "invalid", message: "Please enter your first name." };

  const phone = typeof input.phone === "string" ? normalizeUsPhone(input.phone) : null;
  if (!phone) return { status: "invalid", message: "Please enter a valid US mobile number." };

  if (input.consent !== true) {
    return { status: "invalid", message: "Please check the box so we can text you." };
  }

  let habit = typeof input.habit === "string" ? input.habit : "";
  let custom: string | null = null;
  if (!getHabit(habit) || HELD_HABITS.has(habit)) {
    return { status: "invalid", message: "Please pick what you want to quit." };
  }
  if (habit === "other") {
    const typed = typeof input.customHabit === "string" ? input.customHabit.trim() : "";
    if (typed.length < 2) return { status: "invalid", message: "Tell us what you want to quit in a few words." };
    const result = await checkCustomHabit(typed);
    if (result.outcome === "refer") {
      if (!result.helpline) return { status: "invalid", message: "Try describing a habit you want to quit in a few plain words." };
      return { status: "referral", message: result.message, helpline: result.helpline };
    }
    if (result.outcome === "map") {
      if (HELD_HABITS.has(result.slug)) {
        return { status: "invalid", message: "We're not running that challenge yet. Pick a different habit, or check back soon." };
      }
      habit = result.slug;
    } else {
      custom = result.label;
    }
  }

  const supabase = db();
  const { data: existing } = await supabase.from("users").select("*").eq("phone", phone).limit(1);
  let user = existing?.[0] as UserRow | undefined;

  if (user?.sms_opted_out_at) {
    return { status: "invalid", message: "This number opted out of our texts. Text START to our number first, then sign up again." };
  }
  if (user && (await liveEnrollment(user.id))) return { status: "already_enrolled" };
  if (user?.age_gate_failed_at) return { status: "invalid", message: "Consumption Diet is for adults 18 and over." };

  // Already partway through signing up by text: don't text them again from the form.
  const midSignup = Boolean(user?.convo_state?.startsWith("ob_"));

  const values = {
    first_name: firstName,
    convo_state: midSignup ? user!.convo_state : "web_pending",
    convo_data: midSignup ? user!.convo_data : { habit, custom },
  };
  if (user) {
    const { error } = await supabase.from("users").update(values).eq("id", user.id);
    if (error) throw new Error(`Could not save signup: ${error.message}`);
    user = { ...user, ...values } as UserRow;
  } else {
    const { data: created, error } = await supabase.from("users").insert({ phone, ...values }).select("*").single();
    if (error) throw new Error(`Could not save signup: ${error.message}`);
    user = created as UserRow;
  }

  if (midSignup) return { status: "already_texted" };
  if (!smsReady() || (await webTextsLastHour(now)) >= WEB_TEXTS_PER_HOUR) return { status: "waitlist" };

  const { startFromWeb } = await import("./conversation");
  await startFromWeb(user);
  return { status: "texted" };
}
