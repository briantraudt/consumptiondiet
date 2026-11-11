import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "./config";
import { toSmsText } from "./inbound";

/** Send one text. Returns Twilio's message id. */
export async function sendSms(to: string, body: string): Promise<string> {
  const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
  const authToken = requireEnv("TWILIO_AUTH_TOKEN");
  const params = new URLSearchParams({ To: to, Body: toSmsText(body) });

  if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
    params.set("MessagingServiceSid", process.env.TWILIO_MESSAGING_SERVICE_SID);
  } else {
    params.set("From", requireEnv("TWILIO_FROM_NUMBER"));
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    },
  );

  const result = (await response.json()) as { sid?: string; message?: string; code?: number };
  if (!response.ok || !result.sid) {
    throw new Error(`Twilio send failed (${response.status}): ${result.message ?? "unknown error"}`);
  }
  return result.sid;
}

/** The signature Twilio puts on every webhook, so we can reject fakes. */
export function twilioSignature(
  authToken: string,
  url: string,
  params: Record<string, string>,
): string {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(data, "utf8").digest("base64");
}

export function isValidTwilioSignature(
  authToken: string,
  signature: string | null,
  url: string,
  params: Record<string, string>,
): boolean {
  if (!signature) return false;
  const expected = Buffer.from(twilioSignature(authToken, url, params));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
