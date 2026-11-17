// Settings read from the environment. Nothing secret is hardcoded.

export function appUrl(): string {
  return (process.env.APP_URL ?? "https://www.consumptiondiet.com").replace(/\/$/, "");
}

/** Optional. If set, nobody's challenge starts before this date (YYYY-MM-DD). */
export function launchDate(): string | null {
  return process.env.LAUNCH_DATE || null;
}

export const FREE_DAYS = 7;

/** The number people text, shown as (512) 555-0100. Null until Twilio is set up. */
export function smsNumber(): { e164: string; display: string } | null {
  const e164 = process.env.TWILIO_FROM_NUMBER;
  if (!e164 || !/^\+1\d{10}$/.test(e164)) return null;
  const d = e164.slice(2);
  return { e164, display: `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` };
}

export function challengePriceCents(): number {
  const value = Number(process.env.CHALLENGE_PRICE_CENTS ?? 3100);
  return Number.isInteger(value) && value > 0 ? value : 3100;
}

export function coachModel(): string {
  return process.env.COACH_MODEL ?? "claude-sonnet-5-5";
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

/** True once Twilio is set up and texts can actually be sent. */
export function smsReady(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID),
  );
}
