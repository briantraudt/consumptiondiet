// Reading what people type: commands, times, dates, and requests to stop.

import { addDays, diffDays, isValidDate, localNow } from "./time";

export type CommandName =
  | "begin" | "urge" | "slip" | "stats" | "time" | "pause" | "resume"
  | "partner" | "menu" | "delete" | "commit";

export type Command = { name: CommandName; arg: string };

const EXACT: Array<[CommandName, string[]]> = [
  ["begin", ["begin", "join", "go", "ready", "sign up", "signup", "sign me up"]],
  ["urge", ["urge", "crave", "craving"]],
  ["slip", ["slip", "slipped", "i slipped"]],
  ["stats", ["stats", "progress", "status"]],
  ["pause", ["pause"]],
  ["resume", ["resume", "unpause"]],
  ["menu", ["menu", "commands", "options"]],
  ["delete", ["delete", "delete my data"]],
  ["commit", ["1", "in", "i'm in", "im in"]],
];

/** A command is the whole message, or a command word followed by its details. */
export function parseCommand(body: string): Command | null {
  const text = body.trim().replace(/[.!?]+$/g, "").replace(/\s+/g, " ").toLowerCase();
  if (!text) return null;
  for (const [name, words] of EXACT) {
    if (words.includes(text)) return { name, arg: "" };
  }
  const [first, ...rest] = text.split(" ");
  if (first === "time" || first === "partner") return { name: first, arg: rest.join(" ") };
  return null;
}

// ---------------------------------------------------------------- times

type TimeToken = { hour: number; minute: number; meridiem: "am" | "pm" | null };

const DATE_SLASH = /(?<!\d)(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{4}|\d{2}))?(?!\d)/g;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DATE_NAMED = new RegExp(`\\b(${MONTHS.join("|")})[a-z]*\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`, "gi");

function stripDates(text: string): string {
  return text.replace(DATE_SLASH, " ").replace(DATE_NAMED, " ");
}

function timeTokens(text: string): TimeToken[] {
  const clean = stripDates(text.toLowerCase()).replace(/\b([ap])\.\s?m\.?/g, "$1m");
  const tokens: TimeToken[] = [];
  const re = /(?<![\d:])(\d{1,2})(?::(\d{2}))?\s*(am|pm|a|p)?(?![\w:])/g;
  for (const match of clean.matchAll(re)) {
    const hour = Number(match[1]);
    const minute = match[2] ? Number(match[2]) : 0;
    const meridiem = match[3] ? (match[3][0] === "a" ? "am" : "pm") : null;
    if (minute > 59 || hour > 23 || (meridiem && (hour < 1 || hour > 12))) continue;
    tokens.push({ hour, minute, meridiem });
  }
  return tokens;
}

function toMinutes(token: TimeToken, assume: "am" | "pm"): number {
  let hour = token.hour;
  const meridiem = token.meridiem ?? (hour >= 13 || hour === 0 ? null : assume);
  if (meridiem === "am" && hour === 12) hour = 0;
  if (meridiem === "pm" && hour < 12) hour += 12;
  return hour * 60 + token.minute;
}

export function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** "7am 8pm" or "6:30 9" -> morning and evening minutes. Needs two times at least 2 hours apart. */
export function parseTimePair(text: string): { morning: number; evening: number } | null {
  const tokens = timeTokens(text);
  if (tokens.length !== 2) return null;
  const morning = toMinutes(tokens[0], "am");
  const evening = toMinutes(tokens[1], "pm");
  if (evening - morning < 120) return null;
  return { morning, evening };
}

const US_ZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Anchorage", "Pacific/Honolulu",
];
const ARIZONA_CODES = ["480", "520", "602", "623", "928"];
const PUERTO_RICO_CODES = ["787", "939"];

/**
 * Work out a US time zone from the time the person says it is right now.
 * Area code is only used to tell Arizona and Puerto Rico apart from their neighbors.
 */
export function guessTimeZone(text: string, now: Date, phone: string): string | null {
  const tokens = timeTokens(text);
  if (tokens.length !== 1) return null;
  const token = tokens[0];
  const stated = token.meridiem || token.hour >= 13 || token.hour === 0
    ? [toMinutes(token, "am")]
    : [toMinutes(token, "am"), toMinutes(token, "pm")];

  const areaCode = phone.replace(/^\+1/, "").slice(0, 3);
  const zones = [
    ...(ARIZONA_CODES.includes(areaCode) ? ["America/Phoenix"] : []),
    ...(PUERTO_RICO_CODES.includes(areaCode) ? ["America/Puerto_Rico"] : []),
    ...US_ZONES,
  ];
  for (const zone of zones) {
    const actual = localNow(now, zone).minutes;
    for (const minutes of stated) {
      const gap = Math.abs(actual - minutes);
      if (Math.min(gap, 1440 - gap) <= 20) return zone;
    }
  }
  return null;
}

// ---------------------------------------------------------------- dates

/** A birth date typed as MM/DD/YYYY. */
export function parseBirthDate(text: string): string | null {
  const match = text.match(/(?<!\d)(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})(?!\d)/);
  if (!match) return null;
  const date = `${match[3]}-${match[1].padStart(2, "0")}-${match[2].padStart(2, "0")}`;
  return isValidDate(date) && Number(match[3]) > 1900 ? date : null;
}

export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** A start date typed as "1/5" or "Jan 5". Picks the next time that date comes up. */
export function parseStartDate(text: string, today: string): string | null {
  const lower = text.toLowerCase();
  let month: number | null = null;
  let day: number | null = null;

  const named = [...lower.matchAll(DATE_NAMED)][0];
  const slash = [...lower.matchAll(DATE_SLASH)][0];
  if (named) {
    month = MONTHS.indexOf(named[1].slice(0, 3)) + 1;
    day = Number(named[2]);
  } else if (slash) {
    month = Number(slash[1]);
    day = Number(slash[2]);
  }
  if (!month || !day) return null;

  const year = Number(today.slice(0, 4));
  for (const y of [year, year + 1]) {
    const date = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (isValidDate(date) && diffDays(date, today) >= 1) return date;
  }
  return null;
}

export function defaultStartDate(today: string, launchDate: string | null): string {
  const tomorrow = addDays(today, 1);
  return launchDate && diffDays(launchDate, tomorrow) > 0 ? launchDate : tomorrow;
}

// ---------------------------------------------------------------- opting out

const OPT_OUT_PATTERNS = [
  /\bstop (texting|messaging|sending|contacting)\b/,
  /\b(don'?t|do not|quit|stop) (text|message|contact) me\b/,
  /\bunsubscribe\b/,
  /\bopt(ing)? (me )?out\b/,
  /\b(remove|take) me (off|from)\b/,
  /\bno more (texts|messages|msgs)\b/,
  /\bleave me alone\b/,
  /\bstop (these|the|all|your) (texts|messages|msgs)\b/,
  /\bcancel (my|the) (texts|messages|subscription|account)\b/,
];

/**
 * People can opt out in their own words, not just with the word STOP.
 * This catches plain requests so they are honored instead of going to the coach.
 */
export function detectOptOutIntent(body: string): boolean {
  const text = body.toLowerCase();
  return OPT_OUT_PATTERNS.some((pattern) => pattern.test(text));
}

// ---------------------------------------------------------------- keeping texts neutral

const NAMED_HABIT_WORDS =
  /\b(alcohol\w*|beer|wine|liquor|vodka|whiskey|booze|weed|marijuana|cannabis|thc|vap(e|es|ing)|nicotine|tobacco|cigarettes?|porn\w*|gambl\w*|casino|betting|sportsbook)\b/i;

/** True when a text names a sensitive habit. Outbound texts must never do this. */
export function namesSensitiveHabit(text: string): boolean {
  return NAMED_HABIT_WORDS.test(text);
}
