import { diffDays, type LocalNow } from "./time";

export const CHALLENGE_DAYS = 30;

// A text is only sent within this many minutes of its slot. If the system is
// down for longer, the text is skipped instead of arriving at an odd hour.
export const SEND_WINDOW_MINUTES = 180;

const WEEKLY_START = 16 * 60; // Sunday summary goes out from 4:00 PM local

export type SendKind = "morning" | "evening" | "weekly" | "complete";

export type DueSend = {
  kind: SendKind;
  sendDate: string;
  dayNumber: number;
};

export type ScheduleInput = {
  startDate: string;
  morningMinutes: number;
  eveningMinutes: number;
};

/** Day 1 is the start date. Returns 0 or less before the challenge starts. */
export function dayNumber(startDate: string, localDate: string): number {
  return diffDays(localDate, startDate) + 1;
}

function inWindow(minutes: number, slot: number): boolean {
  return minutes >= slot && minutes < slot + SEND_WINDOW_MINUTES;
}

/** Which texts are due for this enrollment right now. Pure: no I/O. */
export function dueSends(input: ScheduleInput, local: LocalNow): DueSend[] {
  const day = dayNumber(input.startDate, local.date);
  const due: DueSend[] = [];
  const base = { sendDate: local.date, dayNumber: day };

  if (day >= 1 && day <= CHALLENGE_DAYS) {
    if (inWindow(local.minutes, input.morningMinutes)) {
      due.push({ kind: "morning", ...base });
    }
    if (inWindow(local.minutes, input.eveningMinutes)) {
      due.push({ kind: "evening", ...base });
    }
    if (local.weekday === 0 && day >= 2 && inWindow(local.minutes, WEEKLY_START)) {
      due.push({ kind: "weekly", ...base });
    }
  }

  if (day === CHALLENGE_DAYS + 1 && inWindow(local.minutes, input.morningMinutes)) {
    due.push({ kind: "complete", ...base });
  }

  return due;
}
