import { describe, expect, it } from "vitest";
import { toSmsText } from "@/lib/inbound";
import { namesSensitiveHabit } from "@/lib/parse";
import { TEXT_SCREENING } from "@/lib/habits";
import { startLabel, texts } from "@/lib/texts";

// One example of every text the product can send.
const samples: Record<string, string> = {
  intro: texts.intro(),
  webIntro: texts.webIntro({ firstName: 'Christopherson-Smith' }),
  askHabitAgain: texts.askHabitAgain(),
  habitHeld: texts.habitHeld(),
  referral: texts.referral(TEXT_SCREENING.alcohol[0].referOnYes!),
  referralCrisis: texts.referral(TEXT_SCREENING.gambling[0].referOnYes!),
  askAnswerYesNo: texts.askAnswerYesNo(),
  askBirthDateAndTime: texts.askBirthDateAndTime(),
  askBirthDateAgain: texts.askBirthDateAgain(),
  askTimeNow: texts.askTimeNow(),
  askTimeNowAgain: texts.askTimeNowAgain(),
  under18: texts.under18(),
  under21: texts.under21(),
  askTimes: texts.askTimes(),
  askTimesAgain: texts.askTimesAgain(),
  consentFree: texts.consent({ morning: 690, evening: 1350, startLabel: "September 30", free: true }),
  consentPaid: texts.consent({ morning: 690, evening: 1350, startLabel: "September 30", free: false }),
  consentAgain: texts.consentAgain(),
  welcome: texts.welcome({ startLabel: "September 30", morning: 690 }),
  payFirst: texts.payFirst({ payUrl: "https://www.consumptiondiet.com/pay/0123456789abcdef01234567" }),
  morning: texts.morning({ day: 30, prompt: "x".repeat(117), videoUrl: "https://www.consumptiondiet.com/watch", missedYesterday: true }),
  commitAck: texts.commitAck(),
  evening: texts.evening({ day: 30 }),
  eveningGentle: texts.eveningGentle({ day: 30 }),
  win: texts.win({ won: 30, day: 30 }),
  loss: texts.loss({ won: 12, day: 14 }),
  weekly: texts.weekly({ won: 20, day: 27 }),
  complete: texts.complete({ won: 30, resultUrl: "https://www.consumptiondiet.com/r/0123456789abcdef01234567" }),
  urge0: texts.urge(0),
  urge1: texts.urge(1),
  urge2: texts.urge(2),
  stats: texts.stats({ day: 30, won: 20, slipped: 10 }),
  notStarted: texts.notStarted({ startLabel: "September 30", morning: 690 }),
  timeHelp: texts.timeHelp(),
  timeSet: texts.timeSet({ morning: 690, evening: 1350 }),
  paused: texts.paused({ day: 30 }),
  pausedNotice: texts.pausedNotice({ day: 30 }),
  pausedForSilence: texts.pausedForSilence({ day: 30 }),
  resumed: texts.resumed({ day: 30, morning: 690 }),
  notPaused: texts.notPaused(),
  menu: texts.menu(),
  deleteConfirm: texts.deleteConfirm(),
  deleted: texts.deleted(),
  freeWeekDone: texts.freeWeekDone({ won: 7, payUrl: "https://www.consumptiondiet.com/pay/0123456789abcdef01234567" }),
  payReminder: texts.payReminder({ payUrl: "https://www.consumptiondiet.com/pay/0123456789abcdef01234567", day: 8 }),
  paid: texts.paid(),
  paidResumed: texts.paidResumed({ day: 8, morning: 690 }),
  paidStart: texts.paidStart({ startLabel: "September 30", morning: 690 }),
  askFirstName: texts.askFirstName(),
  partnerHowTo: texts.partnerHowTo(),
  partnerForward: texts.partnerForward({ code: "48213", number: "(512) 555-0100" }),
  partnerNoNumber: texts.partnerNoNumber(),
  partnerWelcome: texts.partnerWelcome({ firstName: "Christopher" }),
  partnerJoined: texts.partnerJoined(),
  partnerCodeUnknown: texts.partnerCodeUnknown(),
  partnerOwnPhone: texts.partnerOwnPhone(),
  partnerRemoved: texts.partnerRemoved(),
  partnerMissed: texts.partnerMissed({ firstName: "Christopher" }),
  partnerNoCheckIn: texts.partnerNoCheckIn({ firstName: "Christopher" }),
  partnerWeekly: texts.partnerWeekly({ firstName: "Christopher", won: 20, day: 27 }),
  partnerNote: texts.partnerNote(),
  safetyCrisis: texts.safetyCrisis(),
  safetyMedical: texts.safetyMedical(),
  coachUnavailable: texts.coachUnavailable(),
  optedOut: texts.optedOut(),
  explainer: texts.explainer(),
};

describe("every text we send", () => {
  it("has a sample here", () => {
    for (const name of Object.keys(texts)) {
      expect(Object.keys(samples).some((key) => key.startsWith(name))).toBe(true);
    }
  });

  for (const [name, body] of Object.entries(samples)) {
    it(`${name}: never names a habit`, () => {
      expect(namesSensitiveHabit(body)).toBe(false);
    });
    it(`${name}: uses plain characters and fits in two segments`, () => {
      expect(toSmsText(body)).toBe(body);
      expect(body.length).toBeLessThanOrEqual(306); // two 153-character segments
    });
  }

  it("fits the everyday texts in one segment", () => {
    for (const name of ["evening", "win", "weekly", "commitAck", "stats", "timeSet", "paused", "resumed", "partnerMissed", "partnerNoCheckIn", "partnerWeekly"]) {
      expect(samples[name].length, name).toBeLessThanOrEqual(160);
    }
  });
});

describe("required wording", () => {
  it("puts the program name, frequency, rates and opt-out in the first text", () => {
    const intro = texts.intro();
    for (const part of ["Consumption Diet", "msgs/day", "Msg & data rates may apply", "Reply STOP", "HELP", "/terms"]) {
      expect(intro).toContain(part);
    }
  });

  it("asks for a clear YES and states the price before recurring texts start", () => {
    const consent = texts.consent({ morning: 420, evening: 1200, startLabel: "tomorrow", free: true });
    expect(consent).toContain("Reply YES");
    expect(consent).toContain("recurring texts");
    expect(consent).toContain("$31");
    expect(consent).toContain("7 days free");
  });

  it("tells people the coach is an AI when they join", () => {
    expect(texts.welcome({ startLabel: "tomorrow", morning: 420 })).toContain("AI");
    expect(texts.paidStart({ startLabel: "tomorrow", morning: 420 })).toContain("AI");
  });

  it("gives a partner the same disclosures", () => {
    const welcome = texts.partnerWelcome({ firstName: "Sam" });
    for (const part of ["Consumption Diet", "msgs/month", "Msg & data rates may apply", "Reply STOP", "HELP"]) {
      expect(welcome).toContain(part);
    }
  });

  it("keeps a slip from sounding like a reset", () => {
    const loss = texts.loss({ won: 4, day: 6 });
    expect(loss).toContain("4 wins");
    expect(loss).toContain("Tomorrow is day 7");
    expect(loss).not.toContain("day 1");
    expect(texts.loss({ won: 1, day: 30 })).toContain("1 win.");
  });

  it("says tomorrow when the start is tomorrow", () => {
    expect(startLabel("2027-01-02", "2027-01-02")).toBe("tomorrow");
    expect(startLabel("2027-01-05", "2027-01-02")).toBe("January 5");
  });
});
