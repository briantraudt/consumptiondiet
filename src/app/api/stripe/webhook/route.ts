import { NextResponse } from "next/server";
import Stripe from "stripe";
import { activateEnrollment } from "@/lib/engine";

export const maxDuration = 30;

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ message: "Stripe is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ message: "Missing signature." }, { status: 400 });

  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return NextResponse.json({ message: "Invalid signature." }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    const enrollmentId = session.client_reference_id ?? session.metadata?.enrollment_id;
    if (enrollmentId && session.payment_status === "paid") {
      const customerId = typeof session.customer === "string" ? session.customer : null;
      try {
        await activateEnrollment(enrollmentId, customerId);
      } catch (err) {
        console.error("stripe webhook: activation failed", err instanceof Error ? err.message : err);
        // A 500 makes Stripe retry, which is what we want.
        return NextResponse.json({ message: "Activation failed." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
