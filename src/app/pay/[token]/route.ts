import { NextResponse } from "next/server";
import Stripe from "stripe";
import { appUrl, challengePriceCents } from "@/lib/config";
import { db } from "@/lib/db";

export const maxDuration = 30;

/** The link sent by text. Opens Stripe's hosted checkout for this person's challenge. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{24}$/.test(token)) {
    return new NextResponse("This payment link isn't valid.", { status: 404 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return new NextResponse("Payments aren't open yet. Please try again soon.", { status: 503 });
  }

  const { data } = await db()
    .from("enrollments")
    .select("id, status, paid_at")
    .eq("result_token", token)
    .in("status", ["pending_payment", "scheduled", "active", "paused"])
    .limit(1);
  const enrollment = data?.[0];
  if (!enrollment) {
    return new NextResponse("This payment link has expired. Text BEGIN to start again.", { status: 404 });
  }
  if (enrollment.paid_at) {
    return NextResponse.redirect(`${appUrl()}/start/success`, 303);
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: enrollment.id,
      metadata: { enrollment_id: enrollment.id },
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
    if (!session.url) throw new Error("Stripe returned no checkout URL.");
    return NextResponse.redirect(session.url, 303);
  } catch (err) {
    console.error("pay: stripe checkout failed", err instanceof Error ? err.message : err);
    return new NextResponse("We couldn't open checkout. Please try the link again.", { status: 502 });
  }
}
