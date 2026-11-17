import { describe, expect, it } from "vitest";
import {
  ageOn, defaultStartDate, detectOptOutIntent, guessTimeZone, minutesToTime, namesSensitiveHabit,
  parseBirthDate, parseCommand, parseStartDate, parseTimePair,
} from "@/lib/parse";

describe("parseCommand", () => {
  it("reads command words in any case, with punctuation", () => {
    expect(parseCommand("BEGIN")).toEqual({ name: "begin", arg: "" });
    expect(parseCommand(" urge! ")).toEqual({ name: "urge", arg: "" });
    expect(parseCommand("Slip.")).toEqual({ name: "slip", arg: "" });
    expect(parseCommand("pause")?.name).toBe("pause");
    expect(parseCommand("RESUME")?.name).toBe("resume");
    expect(parseCommand("1")?.name).toBe("commit");
    expect(parseCommand("menu")?.name).toBe("menu");
    expect(parseCommand("DELETE")?.name).toBe("delete");
  });

  it("keeps the details after TIME and PARTNER", () => {
    expect(parseCommand("TIME 6:30am 9pm")).toEqual({ name: "time", arg: "6:30am 9pm" });
    expect(parseCommand("Partner 48213")).toEqual({ name: "partner", arg: "48213" });
    expect(parseCommand("PARTNER OFF")).toEqual({ name: "partner", arg: "off" });
    expect(parseCommand("partner")).toEqual({ name: "partner", arg: "" });
  });

  it("leaves ordinary sentences for the coach", () => {
    expect(parseCommand("I feel an urge coming on")).toBeNull();
    expect(parseCommand("ready to give up honestly")).toBeNull();
    expect(parseCommand("can I pause for a bit?")).toBeNull();
    expect(parseCommand("")).toBeNull();
  });
});

describe("parseTimePair", () => {
  it("reads a morning and an evening time", () => {
    expect(parseTimePair("7am 8pm")).toEqual({ morning: 420, evening: 1200 });
    expect(parseTimePair("6:30 AM and 9:15 p.m.")).toEqual({ morning: 390, evening: 1275 });
    expect(parseTimePair("7 8")).toEqual({ morning: 420, evening: 1200 });
    expect(parseTimePair("07:00, 20:30")).toEqual({ morning: 420, evening: 1230 });
  });

  it("ignores a start date in the same message", () => {
    expect(parseTimePair("7am 8pm 1/5")).toEqual({ morning: 420, evening: 1200 });
    expect(parseTimePair("6am 9pm Jan 5")).toEqual({ morning: 360, evening: 1260 });
  });

  it("asks again when it can't find two sensible times", () => {
    expect(parseTimePair("7am")).toBeNull();
    expect(parseTimePair("whenever")).toBeNull();
    expect(parseTimePair("8pm 9pm 10pm")).toBeNull();
    expect(parseTimePair("7am 8am")).toBeNull();
    expect(parseTimePair("9pm 7am")).toBeNull();
  });

  it("formats minutes for storage", () => {
    expect(minutesToTime(390)).toBe("06:30");
    expect(minutesToTime(1200)).toBe("20:00");
  });
});

describe("guessTimeZone", () => {
  const winter = new Date("2027-01-15T20:15:00Z"); // 2:15 PM Central
  const summer = new Date("2027-07-15T19:15:00Z"); // 2:15 PM Central

  it("works out the zone from the time the person says it is", () => {
    expect(guessTimeZone("2:15pm", winter, "+15125550123")).toBe("America/Chicago");
    expect(guessTimeZone("3:15 pm", winter, "+12125550123")).toBe("America/New_York");
    expect(guessTimeZone("12:15pm", winter, "+13105550123")).toBe("America/Los_Angeles");
    expect(guessTimeZone("10:15am", winter, "+18085550123")).toBe("Pacific/Honolulu");
    expect(guessTimeZone("2:15pm", summer, "+15125550123")).toBe("America/Chicago");
  });

  it("allows a clock that's a few minutes off, and a missing am/pm", () => {
    expect(guessTimeZone("2:25pm", winter, "+15125550123")).toBe("America/Chicago");
    expect(guessTimeZone("2:15", winter, "+15125550123")).toBe("America/Chicago");
    expect(guessTimeZone("04/12/1988 2:15pm", winter, "+15125550123")).toBe("America/Chicago");
  });

  it("uses the area code only to tell Arizona from its neighbors", () => {
    expect(guessTimeZone("1:15pm", winter, "+16025550123")).toBe("America/Phoenix");
    expect(guessTimeZone("1:15pm", winter, "+13035550123")).toBe("America/Denver");
    expect(guessTimeZone("12:15pm", summer, "+16025550123")).toBe("America/Phoenix");
  });

  it("gives up on times that match no US zone, or no time at all", () => {
    expect(guessTimeZone("8:15pm", winter, "+15125550123")).toBeNull();
    expect(guessTimeZone("04/12/1988", winter, "+15125550123")).toBeNull();
    expect(guessTimeZone("afternoon", winter, "+15125550123")).toBeNull();
  });
});

describe("birth dates and age", () => {
  it("reads MM/DD/YYYY", () => {
    expect(parseBirthDate("04/12/1988")).toBe("1988-04-12");
    expect(parseBirthDate("4-2-2001 2:15pm")).toBe("2001-04-02");
    expect(parseBirthDate("04/12/88")).toBeNull();
    expect(parseBirthDate("13/40/1988")).toBeNull();
    expect(parseBirthDate("I'm 30")).toBeNull();
  });

  it("counts age to the day", () => {
    expect(ageOn("2009-01-16", "2027-01-15")).toBe(17);
    expect(ageOn("2009-01-15", "2027-01-15")).toBe(18);
    expect(ageOn("2006-01-16", "2027-01-15")).toBe(20);
    expect(ageOn("2006-01-15", "2027-01-15")).toBe(21);
  });
});

describe("start dates", () => {
  it("reads a date and picks the next time it comes up", () => {
    expect(parseStartDate("7am 8pm 1/5", "2026-12-20")).toBe("2027-01-05");
    expect(parseStartDate("7am 8pm Jan 5", "2026-12-20")).toBe("2027-01-05");
    expect(parseStartDate("7am 8pm 12/25", "2026-12-20")).toBe("2026-12-25");
    expect(parseStartDate("7am 8pm", "2026-12-20")).toBeNull();
  });

  it("defaults to tomorrow, or the launch date if that is later", () => {
    expect(defaultStartDate("2026-12-20", null)).toBe("2026-12-21");
    expect(defaultStartDate("2026-12-20", "2027-01-01")).toBe("2027-01-01");
    expect(defaultStartDate("2027-02-01", "2027-01-01")).toBe("2027-02-02");
  });
});

describe("detectOptOutIntent", () => {
  it("catches opt-outs in plain words", () => {
    for (const text of [
      "please stop texting me",
      "Unsubscribe me",
      "take me off this list",
      "no more texts",
      "don't text me again",
      "I want to opt out",
      "leave me alone",
    ]) {
      expect(detectOptOutIntent(text)).toBe(true);
    }
  });

  it("doesn't mistake talk about quitting the habit for an opt-out", () => {
    for (const text of [
      "I can't stop thinking about it",
      "I want to stop for good",
      "how do I stop the cravings",
      "I need to cancel plans tonight to avoid it",
    ]) {
      expect(detectOptOutIntent(text)).toBe(false);
    }
  });
});

describe("namesSensitiveHabit", () => {
  it("flags words carriers filter on", () => {
    for (const text of ["no alcohol tonight", "put the vape away", "skip the casino", "Porn-free day"]) {
      expect(namesSensitiveHabit(text)).toBe(true);
    }
  });

  it("allows everyday wording", () => {
    expect(namesSensitiveHabit("Drink a glass of water and step outside.")).toBe(false);
    expect(namesSensitiveHabit("You've got this habit beat today.")).toBe(false);
  });
});
