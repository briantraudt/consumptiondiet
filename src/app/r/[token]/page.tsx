import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/page-shell";
import { db } from "@/lib/db";
import { CHALLENGE_DAYS } from "@/lib/schedule";
import { addDays } from "@/lib/time";

export const metadata: Metadata = {
  title: "30 days | Consumption Diet",
  description: "30 days. One habit. One day at a time.",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{24}$/.test(token)) notFound();

  const { data } = await db()
    .from("enrollments")
    .select("id, start_date, status, users!inner(first_name), check_ins(day, won)")
    .eq("result_token", token)
    .in("status", ["active", "completed", "continuing"])
    .limit(1);
  const enrollment = data?.[0];
  if (!enrollment) notFound();

  const user = Array.isArray(enrollment.users) ? enrollment.users[0] : enrollment.users;
  const name = (user as { first_name: string | null } | undefined)?.first_name ?? "They";
  const results = new Map<string, boolean>();
  for (const c of (enrollment.check_ins ?? []) as Array<{ day: string; won: boolean }>) {
    results.set(c.day, c.won);
  }
  const days = Array.from({ length: CHALLENGE_DAYS }, (_, i) => results.get(addDays(enrollment.start_date, i)));
  const won = days.filter((d) => d === true).length;
  const finished = enrollment.status !== "active";

  // The habit is never shown here. This page is meant to be shared.
  return (
    <PageShell>
      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#4aa23a]">
        {finished ? "30-day challenge complete" : "30-day challenge in progress"}
      </p>
      <h1 className="mt-3 text-balance text-4xl font-semibold leading-tight sm:text-5xl">
        {name} won {won} of {CHALLENGE_DAYS} days.
      </h1>

      <ol aria-label="Day by day" className="mt-8 grid grid-cols-6 gap-2 sm:grid-cols-10">
        {days.map((result, i) => (
          <li
            aria-label={`Day ${i + 1}: ${result === true ? "won" : result === false ? "missed" : "no check-in"}`}
            className={`flex aspect-square items-center justify-center rounded-sm text-sm font-semibold tabular-nums ${
              result === true
                ? "bg-[#2f7d24] text-white"
                : result === false
                  ? "border border-white/40 text-white/80"
                  : "border border-dashed border-white/20 text-white/40"
            }`}
            key={i}
          >
            {i + 1}
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-white/65">Green is a day won. A slip doesn&apos;t reset the count.</p>

      <div className="mt-10 border-l-2 border-[#4aa23a] pl-5">
        <p className="text-xl font-semibold">Quit one thing. 30 days.</p>
        <Link
          className="mt-4 inline-flex min-h-12 items-center rounded-sm bg-[#2f7d24] px-6 text-base font-semibold text-white hover:bg-[#25651c] focus:outline-none focus:ring-2 focus:ring-[#4aa23a]"
          href="/start"
        >
          Start your 30 days
        </Link>
      </div>
    </PageShell>
  );
}
