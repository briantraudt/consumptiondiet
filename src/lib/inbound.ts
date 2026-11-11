// Sorting an incoming text into what it means.

export type InboundIntent = "stop" | "start" | "help" | "yes" | "no" | "other";

// Carriers reserve these words. Twilio answers them itself; we only record them.
const STOP_WORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "revoke", "optout"]);
const START_WORDS = new Set(["start", "unstop"]);
const HELP_WORDS = new Set(["help", "info"]);
const YES_WORDS = new Set(["y", "yes", "yep", "yeah", "yup", "won", "win", "i won"]);
const NO_WORDS = new Set(["n", "no", "nope", "lost", "i lost", "slipped", "i slipped"]);

export function classifyInbound(body: string): InboundIntent {
  const text = body.trim().toLowerCase().replace(/[.!?]+$/g, "").trim();
  if (STOP_WORDS.has(text)) return "stop";
  if (START_WORDS.has(text)) return "start";
  if (HELP_WORDS.has(text)) return "help";
  if (YES_WORDS.has(text)) return "yes";
  if (NO_WORDS.has(text)) return "no";
  return "other";
}

const CRISIS_PATTERNS = [
  /\bkill(ing)? myself\b/,
  /\bsuicid/,
  /\bend(ing)? (my|it) (life|all)\b/,
  /\bend my life\b/,
  /\bwant to die\b/,
  /\bwanna die\b/,
  /\bbetter off dead\b/,
  /\bhurt(ing)? myself\b/,
  /\bharm(ing)? myself\b/,
  /\bself[- ]harm/,
  /\bcut(ting)? myself\b/,
  /\bno reason to live\b/,
  /\bdon'?t want to (be here|live|be alive)\b/,
  /\boverdos/,
];

const MEDICAL_PATTERNS = [
  /\bseizure/,
  /\bchest pain/,
  /\bcan'?t breathe\b/,
  /\bhallucinat/,
  /\bpassed out\b/,
  /\bthe shakes\b/,
  /\bshaking (badly|uncontrollably)\b/,
];

export type SafetyFlag = "crisis" | "medical" | null;

/**
 * A fixed check that runs before the coach. A match gets a fixed safety
 * message and never reaches the model.
 */
export function detectSafetyFlag(body: string): SafetyFlag {
  const text = body.toLowerCase();
  if (CRISIS_PATTERNS.some((p) => p.test(text))) return "crisis";
  if (MEDICAL_PATTERNS.some((p) => p.test(text))) return "medical";
  return null;
}

/** US numbers only for now. Returns +1XXXXXXXXXX or null. */
export function normalizeUsPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(ten)) return null;
  return `+1${ten}`;
}

/** Keep texts in the basic SMS character set so they stay cheap and short. */
export function toSmsText(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}
