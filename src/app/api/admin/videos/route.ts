import { NextResponse } from "next/server";
import { isAdmin, parseYouTubeId } from "@/lib/admin";
import { db } from "@/lib/db";
import { isValidDate } from "@/lib/time";

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ message: "Please sign in." }, { status: 401 });
  }

  let body: { date?: unknown; url?: unknown; title?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Please submit the form again." }, { status: 400 });
  }

  const date = typeof body.date === "string" ? body.date : "";
  if (!isValidDate(date)) {
    return NextResponse.json({ message: "Pick the date this video is for." }, { status: 400 });
  }
  const youtubeId = typeof body.url === "string" ? parseYouTubeId(body.url) : null;
  if (!youtubeId) {
    return NextResponse.json({ message: "That doesn't look like a YouTube link." }, { status: 400 });
  }
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 120) : "";

  const { error } = await db()
    .from("videos")
    .upsert({ video_date: date, youtube_id: youtubeId, title: title || null }, { onConflict: "video_date" });
  if (error) {
    console.error("admin: video save failed", error.message);
    return NextResponse.json({ message: "Could not save the video." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
