// Every fixed text the product sends. Kept in one place so the wording is easy to improve.

import { HELPLINES } from "./habits";
import { CHALLENGE_DAYS } from "./schedule";
import { formatDate, formatTime } from "./time";

export const texts = {
  welcome(p: { firstName: string; phrase: string; startDate: string; morning: number; evening: number }) {
    return `Consumption Diet: You're in, ${p.firstName}. Your 30 days off ${p.phrase} start ${formatDate(p.startDate)}. Morning text at ${formatTime(p.morning)}, check-in at ${formatTime(p.evening)}. Msg & data rates may apply. Reply STOP to cancel, HELP for help.`;
  },

  morning(p: { day: number; prompt: string; videoUrl: string | null }) {
    const video = p.videoUrl ? ` Today's video: ${p.videoUrl}` : "";
    return `Day ${p.day}/${CHALLENGE_DAYS}: ${p.prompt}${video}`;
  },

  evening(p: { day: number }) {
    return `Day ${p.day}: Did you win today? Reply Y or N. Rough moment? Text me what's going on.`;
  },

  win(p: { won: number; day: number }) {
    return `Day won. That's ${p.won} of ${p.day}. See you in the morning.`;
  },

  loss(p: { won: number }) {
    const wins = p.won === 1 ? "1 win" : `${p.won} wins`;
    return `Logged. One day doesn't erase ${wins}. Tomorrow counts the same as day 1. Want a plan for that moment? Text me what happened.`;
  },

  weekly(p: { won: number; day: number }) {
    return `Sunday review: ${p.won} of ${p.day} days won so far. ${p.won * 2 >= p.day ? "That's real progress." : "Every day you check in, you're still in it."} Keep going.`;
  },

  complete(p: { won: number; resultUrl: string; startUrl: string }) {
    return `30 days done. You won ${p.won} of ${CHALLENGE_DAYS}. Your result: ${p.resultUrl} Ready for another 30? ${p.startUrl}`;
  },

  partnerInvite(p: { firstName: string; label: string }) {
    return `Consumption Diet: ${p.firstName} asked you to be their accountability partner for ${p.label}. Reply YES to get a short update when they miss a day, plus a Sunday summary. Msg & data rates may apply. Reply STOP to opt out.`;
  },

  partnerWelcome(p: { firstName: string }) {
    return `You're in. We'll text you if ${p.firstName} misses a day, plus a Sunday summary. A quick encouraging text from you goes a long way.`;
  },

  partnerMissed(p: { firstName: string; label: string }) {
    return `${p.firstName} had a hard day in ${p.label}. A quick text from you would help.`;
  },

  partnerNoCheckIn(p: { firstName: string }) {
    return `${p.firstName} didn't check in yesterday. A quick text from you would help.`;
  },

  partnerWeekly(p: { firstName: string; won: number; day: number; startUrl: string }) {
    return `Sunday update: ${p.firstName} has won ${p.won} of ${p.day} days. Want to run your own 30 days? ${p.startUrl}`;
  },

  safetyCrisis() {
    return `I'm glad you told me. This is more than I can help with by text, and you deserve a real person right now. ${HELPLINES.crisis}`;
  },

  safetyMedical() {
    return `That sounds like it needs medical attention, not a coach. If it's an emergency, call 911 now. Otherwise call your doctor today. ${HELPLINES.substance}`;
  },

  coachUnavailable() {
    return `I can't reply right now. Try this: set a 10-minute timer, drink a glass of water, and step outside. The urge will be weaker when the timer ends.`;
  },

  notEnrolled(p: { startUrl: string }) {
    return `You don't have a challenge running right now. Start one any time: ${p.startUrl}`;
  },
};
