// Settings read from the environment. Nothing secret is hardcoded.

export function appUrl(): string {
  return (process.env.APP_URL ?? "https://www.consumptiondiet.com").replace(/\/$/, "");
}

/** First day anyone can start. Signups before this date pick it or later. */
export function launchDate(): string {
  return process.env.LAUNCH_DATE ?? "2027-01-01";
}

export function challengePriceCents(): number {
  const value = Number(process.env.CHALLENGE_PRICE_CENTS ?? 2900);
  return Number.isInteger(value) && value > 0 ? value : 2900;
}

export function coachModel(): string {
  return process.env.COACH_MODEL ?? "claude-sonnet-5-5";
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}
