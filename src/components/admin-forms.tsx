"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const inputClass =
  "min-h-12 w-full rounded-sm border border-white/20 bg-white px-4 text-base font-medium text-[#061f34] outline-none focus:ring-2 focus:ring-[#4aa23a]";
const buttonClass =
  "min-h-12 rounded-sm bg-[#2f7d24] px-6 text-base font-semibold text-white hover:bg-[#25651c] focus:outline-none focus:ring-2 focus:ring-[#4aa23a] disabled:bg-stone-500";

export function AdminLogin() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (response.ok) {
      router.refresh();
      return;
    }
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    setMessage(result.message ?? "Could not sign in.");
  }

  return (
    <form className="grid max-w-sm gap-4" onSubmit={submit}>
      <label className="text-sm font-semibold text-white/90" htmlFor="password">Admin password</label>
      <input autoComplete="current-password" className={inputClass} id="password" onChange={(e) => setPassword(e.target.value)} required type="password" value={password} />
      <button className={buttonClass} disabled={busy} type="submit">{busy ? "Signing in..." : "Sign in"}</button>
      <p aria-live="polite" className="min-h-6 text-sm font-medium text-[#ffb4b4]">{message}</p>
    </form>
  );
}

export function VideoForm({ today }: { today: string }) {
  const router = useRouter();
  const [date, setDate] = useState(today);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, url, title }),
    });
    const result = (await response.json().catch(() => ({}))) as { message?: string };
    setBusy(false);
    setFailed(!response.ok);
    if (response.ok) {
      setMessage("Saved.");
      setUrl("");
      setTitle("");
      router.refresh();
    } else {
      setMessage(result.message ?? "Could not save.");
    }
  }

  return (
    <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <div>
        <label className="mb-2 block text-sm font-semibold text-white/90" htmlFor="videoDate">Date</label>
        <input className={inputClass} id="videoDate" onChange={(e) => setDate(e.target.value)} required type="date" value={date} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-white/90" htmlFor="videoTitle">Title (optional)</label>
        <input className={inputClass} id="videoTitle" maxLength={120} onChange={(e) => setTitle(e.target.value)} value={title} />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-2 block text-sm font-semibold text-white/90" htmlFor="videoUrl">YouTube link</label>
        <input className={inputClass} id="videoUrl" onChange={(e) => setUrl(e.target.value)} placeholder="https://youtu.be/..." required value={url} />
      </div>
      <div className="flex items-center gap-4 sm:col-span-2">
        <button className={buttonClass} disabled={busy} type="submit">{busy ? "Saving..." : "Save video"}</button>
        <p aria-live="polite" className={`text-sm font-medium ${failed ? "text-[#ffb4b4]" : "text-white"}`}>{message}</p>
      </div>
    </form>
  );
}
