import { describe, expect, it } from "vitest";
import { dayNumber, dueSends } from "@/lib/schedule";
import { addDays, diffDays, formatDate, formatTime, isValidDate, localNow, timeToMinutes } from "@/lib/time";

const input = { startDate: "2027-01-01", morningMinutes: 7 * 60, eveningMinutes: 20 * 60 };
const at = (date: string, minutes: number, weekday = 1) => ({ date, minutes, weekday });
const kinds = (date: string, minutes: number, weekday = 1) =>
  dueSends(input, at(date, minutes, weekday)).map((d) => d.kind);

describe("time", () => {
  it("reads the local date and time in the user's timezone", () => {
    // 05:30 UTC on Jan 1 is 11:30 PM on Dec 31 in Chicago.
    const local = localNow(new Date("2027-01-01T05:30:00Z"), "America/Chicago");
    expect(local).toEqual({ date: "2026-12-31", minutes: 23 * 60 + 30, weekday: 4 });
  });

  it("handles midnight as hour 0, not 24", () => {
    expect(localNow(new Date("2027-01-01T06:05:00Z"), "America/Chicago").minutes).toBe(5);
  });

  it("follows daylight saving time", () => {
    expect(localNow(new Date("2027-07-01T12:00:00Z"), "America/Chicago").minutes).toBe(7 * 60);
    expect(localNow(new Date("2027-01-15T13:00:00Z"), "America/Chicago").minutes).toBe(7 * 60);
  });

  it("does date math across months and years", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
    expect(diffDays("2027-01-30", "2027-01-01")).toBe(29);
  });

  it("validates and formats", () => {
    expect(isValidDate("2027-02-30")).toBe(false);
    expect(isValidDate("2027-02-28")).toBe(true);
    expect(timeToMinutes("07:30:00")).toBe(450);
    expect(formatTime(0)).toBe("12:00 AM");
    expect(formatTime(20 * 60)).toBe("8:00 PM");
    expect(formatDate("2027-01-01")).toBe("January 1");
  });
});

describe("dueSends", () => {
  it("counts the start date as day 1", () => {
    expect(dayNumber("2027-01-01", "2027-01-01")).toBe(1);
    expect(dayNumber("2027-01-01", "2027-01-30")).toBe(30);
    expect(dayNumber("2027-01-01", "2026-12-31")).toBe(0);
  });

  it("sends nothing before the start date", () => {
    expect(kinds("2026-12-31", 7 * 60)).toEqual([]);
  });

  it("sends the morning text at the chosen time, not before", () => {
    expect(kinds("2027-01-01", 7 * 60 - 1)).toEqual([]);
    expect(kinds("2027-01-01", 7 * 60)).toEqual(["morning"]);
  });

  it("skips a text that is more than 2 hours late", () => {
    expect(kinds("2027-01-01", 8 * 60 + 59)).toEqual(["morning"]);
    expect(kinds("2027-01-01", 9 * 60)).toEqual([]);
  });

  it("shifts every day later by the days spent paused", () => {
    const paused = { ...input, offsetDays: 7 };
    // Jan 8 would be day 8; after a week off it is day 1 again.
    expect(dueSends(paused, at("2027-01-08", 7 * 60))).toEqual([
      { kind: "morning", sendDate: "2027-01-08", dayNumber: 1 },
    ]);
    expect(dueSends(paused, at("2027-01-07", 7 * 60))).toEqual([]);
    expect(dueSends(paused, at("2027-02-07", 7 * 60)).map((d) => d.kind)).toEqual(["complete"]);
  });

  it("sends the evening check-in at the chosen time", () => {
    expect(kinds("2027-01-01", 20 * 60)).toEqual(["evening"]);
    expect(kinds("2027-01-30", 20 * 60)).toEqual(["evening"]);
  });

  it("sends the Sunday summary from 4 PM, but not on day 1", () => {
    expect(kinds("2027-01-03", 16 * 60, 0)).toEqual(["weekly"]);
    expect(kinds("2027-01-03", 16 * 60, 1)).toEqual([]);
    expect(dueSends({ ...input, startDate: "2027-01-03" }, at("2027-01-03", 16 * 60, 0))).toEqual([]);
  });

  it("sends the wrap-up on the morning of day 31 and nothing else after day 30", () => {
    expect(kinds("2027-01-31", 7 * 60)).toEqual(["complete"]);
    expect(kinds("2027-01-31", 20 * 60)).toEqual([]);
    expect(kinds("2027-02-01", 7 * 60)).toEqual([]);
  });
});
