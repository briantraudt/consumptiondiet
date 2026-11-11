import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { db } from "@/lib/db";
import { formatDate, localNow } from "@/lib/time";

export const metadata: Metadata = {
  title: "Today's video | Consumption Diet",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

async function latestVideo() {
  try {
    const today = localNow(new Date(), "America/Chicago").date;
    const { data } = await db()
      .from("videos")
      .select("video_date, youtube_id, title")
      .lte("video_date", today)
      .order("video_date", { ascending: false })
      .limit(1);
    return data?.[0] ?? null;
  } catch (err) {
    console.error("watch: could not load video", err instanceof Error ? err.message : err);
    return null;
  }
}

export default async function WatchPage() {
  const video = await latestVideo();

  return (
    <PageShell>
      {video ? (
        <>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#4aa23a]">
            {formatDate(video.video_date)}
          </p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight">{video.title ?? "Today's video"}</h1>
          <div className="mt-6 aspect-video w-full overflow-hidden rounded-sm bg-black">
            <iframe
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
              referrerPolicy="strict-origin-when-cross-origin"
              src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}?rel=0`}
              title={video.title ?? "Today's video"}
            />
          </div>
          <p className="mt-6 text-lg leading-7 text-white/85">
            Then put the phone down and go win today.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold leading-tight">No video yet today.</h1>
          <p className="mt-4 text-lg leading-7 text-white/85">Check back a little later. Your prompt for today is in your texts.</p>
        </>
      )}
    </PageShell>
  );
}
