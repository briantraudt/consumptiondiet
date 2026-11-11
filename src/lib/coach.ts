import Anthropic from "@anthropic-ai/sdk";
import { coachModel } from "./config";
import { toSmsText } from "./inbound";

export type CoachContext = {
  firstName: string;
  habit: string; // how the habit reads in a sentence
  day: number; // 0 or less means the challenge hasn't started
  daysWon: number;
  history: Array<{ direction: "in" | "out"; body: string }>;
  message: string;
};

const MAX_REPLY_CHARS = 320;

function systemPrompt(ctx: CoachContext): string {
  const progress =
    ctx.day >= 1
      ? `They are on day ${ctx.day} of 30 and have won ${ctx.daysWon} day(s) so far.`
      : "Their 30 days have not started yet.";

  return `You are the text-message coach for Consumption Diet, a 30-day challenge that helps people quit one habit.

You are texting with ${ctx.firstName}, who is quitting: ${ctx.habit}. ${progress}

How to reply:
- Plain text only, under 300 characters. No emojis, no markdown, no lists.
- Sound like a steady friend who has been through it. Warm, direct, never preachy.
- Give ONE concrete thing to do in the next 10 minutes. Be specific to what they said.
- If they slipped: no shame. A slip is one day. Help them get back on track today.
- Do not lecture, moralize, or pile on advice. One idea per text.
- Only talk about their habit and their 30 days. If they ask for something unrelated, say briefly that you're here for the challenge.

Hard limits:
- You are not a doctor, therapist, or counselor. Never give medical advice, dosing, tapering, or detox instructions.
- If they mention thoughts of suicide or self-harm, do not coach. Tell them you're glad they said it and to call or text 988 now, or 911 in an emergency.
- If they describe withdrawal symptoms (shakes, sweats, racing heart, seizure, hallucinations) or any medical emergency, tell them to call their doctor or 911 now. For alcohol or drugs you can add the SAMHSA helpline: 1-800-662-4357.
- Never encourage quitting prescribed medication.
- Never claim to be a human. If asked, say you're an AI coach.`;
}

/** One coach reply. Throws if the model can't be reached; the caller sends a fallback. */
export async function coachReply(ctx: CoachContext): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const client = new Anthropic({ apiKey });

  // Merge history into alternating turns ending with the new message.
  const turns: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const item of [...ctx.history, { direction: "in" as const, body: ctx.message }]) {
    const role = item.direction === "in" ? "user" : "assistant";
    const last = turns[turns.length - 1];
    if (last && last.role === role) {
      last.content += `\n${item.body}`;
    } else {
      turns.push({ role, content: item.body });
    }
  }
  while (turns.length > 0 && turns[0].role !== "user") turns.shift();

  const response = await client.messages.create({
    model: coachModel(),
    max_tokens: 200,
    system: systemPrompt(ctx),
    messages: turns,
  });

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join(" ");
  const clean = toSmsText(text.replace(/\n+/g, " "));
  if (!clean) throw new Error("Coach returned an empty reply.");
  if (clean.length <= MAX_REPLY_CHARS) return clean;

  // Cut at the last full sentence that fits.
  const cut = clean.slice(0, MAX_REPLY_CHARS);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "), cut.lastIndexOf("! "));
  return end > 80 ? cut.slice(0, end + 1) : cut;
}
