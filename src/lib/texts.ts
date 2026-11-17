// Every fixed text the product sends. Kept in one place so the wording is easy to improve.
//
// Two rules for everything in this file:
// 1. No text names a habit. Carriers filter on those words and texts show on lock screens.
// 2. Plain characters only, 160 or fewer where possible, never more than 320.

import { CHALLENGE_DAYS } from "./schedule";
import { formatDate, formatTime } from "./time";

const CRISIS = "Call or text 988 (Suicide & Crisis Lifeline), free, 24/7. In an emergency call 911.";
const SUPPORT_LINE = "SAMHSA National Helpline: 1-800-662-4357, free, 24/7.";

export const texts = {
  // ---- signing up by text
  intro() {
    return "Consumption Diet: quit one habit in 30 days, by text. About 2 msgs/day. Msg & data rates may apply. Reply STOP to cancel, HELP for help. consumptiondiet.com/terms\n\nWhat's the one habit you want to quit? Say it your way.";
  },
  askHabitAgain() {
    return "I didn't catch that. In a few words, what's the one habit you want to quit?";
  },
  habitHeld() {
    return "We're not running that challenge yet. Reply with a different habit, or check back soon at consumptiondiet.com.";
  },
  referral(p: { message: string; helpline: string }) {
    return `${p.message} ${p.helpline}`.trim();
  },
  askAnswerYesNo() {
    return "Please reply Y or N so I can keep you safe.";
  },
  askBirthDateAndTime() {
    return "Got it. Two quick things: your date of birth and the time where you are right now. Like: 04/12/1988 2:15pm. Your birth date is only used to confirm your age.";
  },
  askBirthDateAgain() {
    return "I need your date of birth as MM/DD/YYYY, like 04/12/1988.";
  },
  askTimeNow() {
    return "What time is it for you right now? Like: 2:15pm. That sets your time zone.";
  },
  askTimeNowAgain() {
    return "That doesn't match a US time zone. What time is it for you right now? Like: 2:15pm.";
  },
  under18() {
    return "Consumption Diet is for adults 18 and over, so we can't sign you up. Take care of yourself.";
  },
  under21() {
    return "That challenge is for 21 and over. Reply with a different habit you want to quit.";
  },
  askTimes() {
    return "When do you want your texts? Reply with a morning time and an evening check-in time, like: 7am 8pm. Want a later start? Add a date: 7am 8pm 1/5.";
  },
  askTimesAgain() {
    return "I need two times at least 2 hours apart: a morning text and an evening check-in. Like: 7am 8pm.";
  },
  consent(p: { morning: number; evening: number; startLabel: string; free: boolean }) {
    const price = p.free
      ? "First 7 days free, then $31 once. No card needed now."
      : "30 days is $31, paid by a secure link I'll send next.";
    return `Morning text ${formatTime(p.morning)}, check-in ${formatTime(p.evening)}, starting ${p.startLabel}. Reply YES to agree to recurring texts from Consumption Diet and start. ${price}`;
  },
  consentAgain() {
    return "Reply YES to start, or STOP to cancel. Nothing more is sent until you say YES.";
  },
  welcome(p: { startLabel: string; morning: number }) {
    return `You're in. Day 1 comes ${p.startLabel} at ${formatTime(p.morning)}. Your coach is an AI: text it any time. Text URGE in a rough moment, MENU for more. Reply STOP to cancel.`;
  },
  payFirst(p: { payUrl: string }) {
    return `One step left: $31 for your 30 days. Pay here and you're set: ${p.payUrl}`;
  },

  // ---- the daily loop
  morning(p: { day: number; prompt: string; videoUrl: string | null; missedYesterday: boolean }) {
    const missed = p.missedYesterday ? " Missed you last night." : "";
    const video = p.videoUrl ? ` Video: ${p.videoUrl}` : "";
    return `Day ${p.day}/${CHALLENGE_DAYS}: ${p.prompt} Reply 1 if you're in.${missed}${video}`;
  },
  commitAck() {
    return "Locked in. Text URGE if it gets hard today.";
  },
  evening(p: { day: number }) {
    return `Day ${p.day}: Did you win today? Reply Y or N. Rough moment? Tell me what's going on.`;
  },
  eveningGentle(p: { day: number }) {
    return `Day ${p.day}: Haven't heard from you in a few days. No judgment either way. How's it going? Reply Y, N, or tell me what's up.`;
  },
  win(p: { won: number; day: number }) {
    return `Day won. That's ${p.won} of ${p.day}. See you in the morning.`;
  },
  loss(p: { won: number; day: number }) {
    const wins = p.won === 1 ? "1 win" : `${p.won} wins`;
    const next = p.day < CHALLENGE_DAYS ? `Tomorrow is day ${p.day + 1}, and it still counts.` : "It still counts.";
    return `Logged. One day doesn't erase ${wins}. ${next} Want a plan for that moment? Tell me what happened.`;
  },
  weekly(p: { won: number; day: number }) {
    const note = p.won * 2 >= p.day ? "That's real progress." : "Every day you check in, you're still in it.";
    return `Sunday review: ${p.won} of ${p.day} days won so far. ${note} Keep going.`;
  },
  complete(p: { won: number; resultUrl: string }) {
    return `30 days done. You won ${p.won} of ${CHALLENGE_DAYS}. Your result: ${p.resultUrl} Text BEGIN any time to take on another habit.`;
  },

  // ---- command words
  urge(index: number) {
    const plans = [
      "Set a 10-minute timer. Drink a glass of water, step outside, and breathe slow until it rings. Urges peak and pass. Still rough after? Tell me what's going on.",
      "Change your location right now: a different room, or out the door for a short walk. Give it 10 minutes before you decide anything. Then tell me how it went.",
      "Say it out loud: 'This is an urge, and it will pass.' Then do 10 slow breaths or 10 pushups. Text me what set it off and we'll make a plan.",
    ];
    return plans[index % plans.length];
  },
  stats(p: { day: number; won: number; slipped: number }) {
    return `Day ${p.day} of ${CHALLENGE_DAYS}. ${p.won} won, ${p.slipped} slipped. You're still in it.`;
  },
  notStarted(p: { startLabel: string; morning: number }) {
    return `You're signed up. Day 1 comes ${p.startLabel} at ${formatTime(p.morning)}. Text URGE if you need help before then.`;
  },
  timeHelp() {
    return "To change your text times, send TIME with a morning and evening time, like: TIME 6:30am 9pm";
  },
  timeSet(p: { morning: number; evening: number }) {
    return `Done. Morning text at ${formatTime(p.morning)}, check-in at ${formatTime(p.evening)}.`;
  },
  paused(p: { day: number }) {
    return `Paused. No texts for 7 days, and the days don't count against you. Day ${p.day} is saved. Text RESUME to come back sooner.`;
  },
  pausedNotice(p: { day: number }) {
    return `Your texts are paused with day ${p.day} saved. Text RESUME to pick up tomorrow.`;
  },
  pausedForSilence(p: { day: number }) {
    return `I haven't heard from you in a week, so I've paused your texts. Day ${p.day} is saved. Text RESUME any time to pick up where you left off.`;
  },
  resumed(p: { day: number; morning: number }) {
    return `Welcome back. Day ${p.day} comes tomorrow at ${formatTime(p.morning)}.`;
  },
  notPaused() {
    return "You're not paused. Your texts are running as usual.";
  },
  menu() {
    return "URGE: help right now. SLIP: log a slip. STATS: your progress. TIME 7am 8pm: change text times. PAUSE / RESUME: take a week off. PARTNER: add a partner. DELETE: erase your data.";
  },
  deleteConfirm() {
    return "This erases your account and everything you've sent, and it can't be undone. Reply DELETE again to confirm.";
  },
  deleted() {
    return "Done. Your data is erased and you won't get more texts. Take care.";
  },

  // ---- payment
  freeWeekDone(p: { won: number; payUrl: string }) {
    return `That's your free week: ${p.won} of 7 days won. Keep going for $31, about $1 a day: ${p.payUrl} Your progress is saved either way.`;
  },
  payReminder(p: { payUrl: string; day: number }) {
    return `Your free week has ended, so your texts are paused with day ${p.day} saved. Pick up where you left off any time: ${p.payUrl}`;
  },
  paid() {
    return "Payment received. Thank you. You're set through day 30.";
  },
  paidResumed(p: { day: number; morning: number }) {
    return `Payment received. Thank you. Day ${p.day} comes tomorrow at ${formatTime(p.morning)}.`;
  },
  paidStart(p: { startLabel: string; morning: number }) {
    return `Payment received. Thank you. Day 1 comes ${p.startLabel} at ${formatTime(p.morning)}. Your coach is an AI: text it any time. Text URGE in a rough moment.`;
  },

  // ---- accountability partner
  askFirstName() {
    return "What's your first name? Your partner will see it so they know who it's from.";
  },
  partnerHowTo() {
    return "Forward my next text to one person you trust. They join by texting the code from their own phone.";
  },
  partnerForward(p: { code: string; number: string }) {
    return `I'm doing a 30-day challenge to drop a habit and I'd like you in my corner. Text PARTNER ${p.code} to ${p.number} and you'll get a short update if I miss a day.`;
  },
  partnerNoNumber() {
    return "Partner invites aren't switched on yet. Try again soon.";
  },
  partnerWelcome(p: { firstName: string }) {
    return `Consumption Diet: you're now ${p.firstName}'s accountability partner. You'll get a text if they miss a day, plus a Sunday summary, about 8 msgs/month. Msg & data rates may apply. Reply STOP to cancel, HELP for help.`;
  },
  partnerJoined() {
    return "Your partner is in. They'll hear from me if you miss a day, and on Sundays.";
  },
  partnerCodeUnknown() {
    return "That partner code didn't match. Ask them to send you a new one.";
  },
  partnerOwnPhone() {
    return "That code is for your partner. Forward the invite so they can text it from their own phone.";
  },
  partnerRemoved() {
    return "Done. Your partner won't get any more updates.";
  },
  partnerMissed(p: { firstName: string }) {
    return `${p.firstName} had a hard day in their 30-day challenge. A quick text from you would help.`;
  },
  partnerNoCheckIn(p: { firstName: string }) {
    return `${p.firstName} didn't check in yesterday. A quick text from you would help.`;
  },
  partnerWeekly(p: { firstName: string; won: number; day: number }) {
    return `Sunday update: ${p.firstName} has won ${p.won} of ${p.day} days. A word from you goes a long way.`;
  },
  partnerNote() {
    return "This number is automated and they won't see what you send here. Text them directly. That's what helps most.";
  },

  // ---- safety and fallbacks
  safetyCrisis() {
    return `I'm glad you told me. This is more than I can help with by text, and you deserve a real person right now. ${CRISIS}`;
  },
  safetyMedical() {
    return `That sounds like it needs medical attention, not a coach. If it's an emergency, call 911 now. Otherwise call your doctor today. ${SUPPORT_LINE}`;
  },
  coachUnavailable() {
    return "I can't reply right now. Try this: set a 10-minute timer, drink a glass of water, and step outside. The urge will be weaker when the timer ends.";
  },
  optedOut() {
    return "You're unsubscribed from Consumption Diet and won't get more messages. Reply START to rejoin.";
  },
  explainer() {
    return "This is Consumption Diet: quit one habit in 30 days, by text. Text BEGIN to start. Reply STOP to opt out.";
  },
};

export function startLabel(startDate: string, tomorrow: string): string {
  return startDate === tomorrow ? "tomorrow" : formatDate(startDate);
}
