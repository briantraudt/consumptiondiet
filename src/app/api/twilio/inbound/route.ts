import { after } from "next/server";
import { appUrl } from "@/lib/config";
import { handleInbound } from "@/lib/engine";
import { isValidTwilioSignature } from "@/lib/twilio";

export const maxDuration = 60;

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

function twiml(status = 200) {
  return new Response(EMPTY_TWIML, { status, headers: { "Content-Type": "text/xml" } });
}

export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return new Response("Twilio is not configured.", { status: 500 });

  const form = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") params[key] = value;
  }

  // Twilio signs the exact public URL it called.
  const url = `${appUrl()}/api/twilio/inbound`;
  if (!isValidTwilioSignature(authToken, request.headers.get("x-twilio-signature"), url, params)) {
    return new Response("Invalid signature.", { status: 403 });
  }

  const from = params.From;
  const body = (params.Body ?? "").slice(0, 1600);
  const sid = params.MessageSid ?? params.SmsMessageSid;
  if (!from || !sid) return twiml();

  // Answer Twilio right away; do the work (and any reply) afterwards.
  after(async () => {
    try {
      await handleInbound(from, body, sid);
    } catch (err) {
      console.error("inbound text failed", err instanceof Error ? err.message : err);
    }
  });

  return twiml();
}
