import type { Metadata } from "next";
import { AdminLogin, VideoForm } from "@/components/admin-forms";
import { PageShell } from "@/components/page-shell";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { getHabit } from "@/lib/habits";
import { addDays, formatDate, localNow } from "@/lib/time";

export const metadata: Metadata = { title: "Admin | Consumption Diet", robots: { index: false } };
export const dynamic = "force-dynamic";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-sm border border-white/15 bg-white/5 p-4">
      <p className="text-3xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-sm text-white/70">{label}</p>
    </div>
  );
}

export default async function AdminPage() {
  if (!(await isAdmin())) {
    return (
      <PageShell>
        <h1 className="mb-8 text-3xl font-semibold">Admin</h1>
        <AdminLogin />
      </PageShell>
    );
  }

  const today = localNow(new Date(), "America/Chicago").date;
  const yesterday = addDays(today, -1);
  const supabase = db();

  const [enrollments, videos, customHabits, yesterdayAsked, yesterdayAnswered] = await Promise.all([
    supabase.from("enrollments").select("status, habit_slug").neq("status", "pending_payment"),
    supabase.from("videos").select("video_date, youtube_id, title").order("video_date", { ascending: false }).limit(10),
    supabase.from("custom_habit_counts").select("habit, signups").limit(15),
    supabase.from("scheduled_sends").select("id", { count: "exact", head: true }).eq("kind", "evening").eq("send_date", yesterday),
    supabase.from("check_ins").select("id", { count: "exact", head: true }).eq("day", yesterday),
  ]);

  const rows = enrollments.data ?? [];
  const byStatus = (status: string) => rows.filter((r) => r.status === status).length;
  const paid = rows.filter((r) => r.status !== "referred_out" && r.status !== "canceled");
  const habitCounts = new Map<string, number>();
  for (const r of paid) habitCounts.set(r.habit_slug, (habitCounts.get(r.habit_slug) ?? 0) + 1);
  const asked = yesterdayAsked.count ?? 0;
  const answered = yesterdayAnswered.count ?? 0;
  const hasToday = (videos.data ?? []).some((v) => v.video_date === today);

  return (
    <PageShell wide>
      <h1 className="text-3xl font-semibold">Admin</h1>

      <section className="mt-8" aria-labelledby="numbers">
        <h2 className="text-xl font-semibold" id="numbers">Numbers</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Paid signups" value={paid.length} />
          <Stat label="Starting soon" value={byStatus("scheduled")} />
          <Stat label="Active now" value={byStatus("active")} />
          <Stat label="Finished" value={byStatus("completed")} />
          <Stat label="Check-in rate yesterday" value={asked ? `${Math.round((answered / asked) * 100)}%` : "No data"} />
        </div>
      </section>

      <section className="mt-12" aria-labelledby="video">
        <h2 className="text-xl font-semibold" id="video">Daily video</h2>
        <p className="mt-2 text-white/75">
          {hasToday ? "Today's video is set." : "No video for today yet. The morning text links to the most recent one."}
        </p>
        <div className="mt-4"><VideoForm today={today} /></div>
        <ul className="mt-6 divide-y divide-white/10 border-y border-white/10">
          {(videos.data ?? []).map((v) => (
            <li className="flex items-center justify-between gap-4 py-3 text-sm" key={v.video_date}>
              <span className="font-semibold">{formatDate(v.video_date)}</span>
              <span className="truncate text-white/75">{v.title ?? "Untitled"}</span>
              <a className="shrink-0 underline" href={`https://youtu.be/${v.youtube_id}`} rel="noreferrer" target="_blank">Open</a>
            </li>
          ))}
          {(videos.data ?? []).length === 0 ? <li className="py-3 text-sm text-white/70">No videos yet.</li> : null}
        </ul>
      </section>

      <section className="mt-12 grid gap-10 sm:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold">Signups by habit</h2>
          <ul className="mt-4 grid gap-2 text-sm">
            {[...habitCounts.entries()].sort((a, b) => b[1] - a[1]).map(([slug, count]) => (
              <li className="flex justify-between border-b border-white/10 pb-2" key={slug}>
                <span>{getHabit(slug)?.name ?? slug}</span>
                <span className="tabular-nums">{count}</span>
              </li>
            ))}
            {habitCounts.size === 0 ? <li className="text-white/70">No signups yet.</li> : null}
          </ul>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Typed &quot;Other&quot; habits</h2>
          <p className="mt-2 text-sm text-white/70">When one shows up often, it&apos;s a candidate for habit 11.</p>
          <ul className="mt-4 grid gap-2 text-sm">
            {(customHabits.data ?? []).map((c) => (
              <li className="flex justify-between border-b border-white/10 pb-2" key={c.habit}>
                <span>{c.habit}</span>
                <span className="tabular-nums">{c.signups}</span>
              </li>
            ))}
            {(customHabits.data ?? []).length === 0 ? <li className="text-white/70">None yet.</li> : null}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
