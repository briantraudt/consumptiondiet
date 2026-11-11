import { NextResponse } from "next/server";
import Stripe from "stripe";
import { appUrl, challengePriceCents, launchDate } from "@/lib/config";
import { checkCustomHabit } from "@/lib/custom-habit";
import { db } from "@/lib/db";
import { evaluateScreening, getHabit } from "@/lib/habits";
import { normalizeUsPhone } from "@/lib/inbound";
import { addDays, diffDays, isValidDate, isValidTime, isValidTimeZone, localNow, timeToMinutes } from "@/lib/time";

export const maxDuration = 30;

type Body = {
  firstName?: unknown;
  phone?: unknown;
  timezone?: unknown;
  habit?: unknown;
  customHabit?: unknown;
  screening?: unknown;
  startDate?: unknown;
  morningTime?: unknown;
  eveningTime?: unknown;
  consent?: unknown;
  partner?: { name?: unknown; phone?: unknown; showHabit?: unknown } | null;
};

function bad(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return bad("Please submit the form again.");
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim().slice(0, 40) : "";
  if (!firstName) return bad("Please enter your first name.");

  const phone = typeof body.phone === "string" ? normalizeUsPhone(body.phone) : null;
  if (!phone) return bad("Please enter a valid US mobile number.");

  if (body.consent !== true) return bad("Please agree to receive texts so we can run your challenge.");

  const timezone = typeof body.timezone === "string" && isValidTimeZone(body.timezone)
    ? body.timezone
    : "America/Chicago";

  const morningTime = typeof body.morningTime === "string" ? body.morningTime : "";
  const eveningTime = typeof body.eveningTime === "string" ? body.eveningTime : "";
  if (!isValidTime(morningTime) || !isValidTime(eveningTime)) return bad("Please pick your text times.");
  const morning = timeToMinutes(morningTime);
  const evening = timeToMinutes(eveningTime);
  if (morning < 4 * 60 || morning > 11 * 60) return bad("Pick a morning time between 4 AM and 11 AM.");
  if (evening < 16 * 60 || evening > 22 * 60 || evening - morning < 6 * 60) {
    return bad("Pick an evening time between 4 PM and 10 PM.");
  }

  const startDate = typeof body.startDate === "string" ? body.startDate : "";
  if (!isValidDate(startDate)) return bad("Please pick a start date.");
  const today = localNow(new Date(), timezone).date;
  const tomorrow = addDays(today, 1);
  const earliest = diffDays(launchDate(), tomorrow) > 0 ? launchDate() : tomorrow;
  if (diffDays(startDate, earliest) < 0) return bad(`The earliest start date is ${earliest}.`);
  if (diffDays(startDate, earliest) > 90) return bad("Pick a start date within the next 90 days.");

  // Habit, including a typed "Other".
  const habitSlug = typeof body.habit === "string" ? body.habit : "";
  let customHabit: string | null = null;
  if (!getHabit(habitSlug)) return bad("Please pick a habit.");

  if (habitSlug === "other") {
    const typed = typeof body.customHabit === "string" ? body.customHabit.trim() : "";
    if (typed.length < 2) return bad("Tell us what you want to quit in a few words.");
    const result = await checkCustomHabit(typed);
    if (result.outcome === "refer") {
      return NextResponse.json({ referral: result });
    }
    if (result.outcome === "map") {
      // Send them back to answer that habit's questions if it has any.
      return NextResponse.json({ mappedTo: result.slug });
    }
    customHabit = result.label;
  }

  const answers = (body.screening && typeof body.screening === "object" ? body.screening : {}) as Record<string, boolean>;
  let note: string | undefined;
  try {
    const screening = evaluateScreening(habitSlug, answers);
    if (screening.outcome === "refer") {
      return NextResponse.json({ referral: screening });
    }
    note = screening.note;
  } catch (err) {
    return bad(err instanceof Error ? err.message : "Please answer every question.");
  }

  // Optional accountability partner.
  let partner: { name: string; phone: string; showHabit: boolean } | null = null;
  if (body.partner && typeof body.partner.name === "string" && body.partner.name.trim()) {
    const partnerPhone = typeof body.partner.phone === "string" ? normalizeUsPhone(body.partner.phone) : null;
    if (!partnerPhone) return bad("Please enter a valid US mobile number for your partner.");
    if (partnerPhone === phone) return bad("Your partner needs a different number than yours.");
    partner = {
      name: body.partner.name.trim().slice(0, 40),
      phone: partnerPhone,
      showHabit: body.partner.showHabit === true,
    };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return bad("Signups aren't open yet. Check back soon.", 503);
  }

  const supabase = db();
  const { data: existing } = await supabase.from("users").select("id, sms_opted_out_at").eq("phone", phone).limit(1);
  const existingUser = existing?.[0];
  if (existingUser?.sms_opted_out_at) {
    return bad("This number opted out of our texts. Text START to our number, then sign up again.", 409);
  }

  const { data: userRows, error: userError } = await supabase
    .from("users")
    .upsert(
      {
        phone,
        first_name: firstName,
        timezone,
        morning_time: morningTime,
        evening_time: eveningTime,
        sms_consent_at: new Date().toISOString(),
      },
      { onConflict: "phone" },
    )
    .select("id");
  if (userError || !userRows?.[0]) {
    console.error("enroll: user upsert failed", userError?.message);
    return bad("Something went wrong. Please try again.", 500);
  }
  const userId = userRows[0].id as string;

  const { data: live } = await supabase
    .from("enrollments").select("id").eq("user_id", userId).in("status", ["scheduled", "active"]).limit(1);
  if (live?.length) {
    return bad("You already have a challenge running. Finish it first, then start the next one.", 409);
  }
  await supabase.from("enrollments").delete().eq("user_id", userId).eq("status", "pending_payment");

  const { data: enrollmentRows, error: enrollmentError } = await supabase
    .from("enrollments")
    .insert({
      user_id: userId,
      habit_slug: habitSlug,
      custom_habit: customHabit,
      start_date: startDate,
      status: "pending_payment",
    })
    .select("id");
  if (enrollmentError || !enrollmentRows?.[0]) {
    console.error("enroll: enrollment insert failed", enrollmentError?.message);
    return bad("Something went wrong. Please try again.", 500);
  }
  const enrollmentId = enrollmentRows[0].id as string;

  if (partner) {
    const { error: partnerError } = await supabase.from("partners").insert({
      enrollment_id: enrollmentId,
      name: partner.name,
      phone: partner.phone,
      show_habit: partner.showHabit,
    });
    if (partnerError) console.error("enroll: partner insert failed", partnerError.message);
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: enrollmentId,
      metadata: { enrollment_id: enrollmentId },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: challengePriceCents(),
            // The habit is never sent to Stripe.
            product_data: { name: "Consumption Diet: 30-Day Challenge" },
          },
        },
      ],
      success_url: `${appUrl()}/start/success`,
      cancel_url: `${appUrl()}/start`,
    });
    await supabase
      .from("enrollments")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", enrollmentId);
    return NextResponse.json({ checkoutUrl: session.url, note });
  } catch (err) {
    console.error("enroll: stripe checkout failed", err instanceof Error ? err.message : err);
    return bad("We couldn't start checkout. Please try again.", 502);
  }
}
