import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { runTick } from "@/lib/engine";

export const maxDuration = 300;

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Called every 15 minutes. Sends every text that is due. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ message: "CRON_SECRET is not configured." }, { status: 500 });
  }
  if (!authorized(request)) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const summary = await runTick();
    if (summary.errors.length) console.error("tick finished with errors", summary);
    return NextResponse.json({ ok: summary.errors.length === 0, ...summary });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("tick failed", message);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
