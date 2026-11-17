"use client";

import { FormEvent, useState } from "react";
import { HABITS, HELD_HABITS } from "@/lib/habits";

type Result =
  | { status: "texted" | "waitlist" | "already_texted" | "already_enrolled" }
  | { status: "invalid"; message: string }
  | { status: "referral"; message: string; helpline: string };

const inputClass =
  "min-h-12 w-full rounded-sm border border-white/20 bg-white px-4 text-base font-medium text-[#061f34] outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-[#4aa23a]";
const labelClass = "mb-2 block text-sm font-semibold text-white/90";

const DONE: Record<string, { title: string; body: string }> = {
  texted: { title: "Check your phone.", body: "We just texted you. Reply to it and you're on your way. It takes about a minute." },
  waitlist: { title: "You're on the list.", body: "We'll text you as soon as we open. Nothing to do until then." },
  already_texted: { title: "Check your phone.", body: "We already texted this number. Reply to that text to finish signing up." },
  already_enrolled: { title: "You're already in.", body: "This number has a challenge running. Text STATS to our number to see where you are." },
};

export function SignupForm() {
  const options = HABITS.filter((h) => !HELD_HABITS.has(h.slug));
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [habit, setHabit] = useState("");
  const [customHabit, setCustomHabit] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, phone, habit, customHabit, consent, website }),
      });
      const data = (await response.json()) as Result;
      if (data.status === "invalid") setError(data.message);
      else setResult(data);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (result && result.status === "referral") {
    return (
      <div className="border-l-2 border-[#4aa23a] pl-5" role="alert">
        <h2 className="text-2xl font-semibold leading-tight">This one needs more than a text challenge.</h2>
        <p className="mt-3 text-lg leading-7 text-white/90">{result.message}</p>
        <p className="mt-3 text-lg font-semibold leading-7">{result.helpline}</p>
        <button
          className="mt-6 min-h-12 rounded-sm border border-white/30 px-5 text-base font-semibold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#4aa23a]"
          onClick={() => { setResult(null); setHabit(""); setCustomHabit(""); }}
          type="button"
        >
          Pick a different habit
        </button>
      </div>
    );
  }

  if (result && result.status !== "invalid") {
    const done = DONE[result.status];
    return (
      <div className="border-l-2 border-[#4aa23a] pl-5" role="status">
        <h2 className="text-3xl font-semibold leading-tight">{done.title}</h2>
        <p className="mt-3 text-lg leading-7 text-white/90">{done.body}</p>
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="firstName">First name</label>
          <input autoComplete="given-name" className={inputClass} id="firstName" maxLength={40} onChange={(e) => setFirstName(e.target.value)} required value={firstName} />
        </div>
        <div>
          <label className={labelClass} htmlFor="phone">Mobile number (US)</label>
          <input autoComplete="tel" className={inputClass} id="phone" inputMode="tel" onChange={(e) => setPhone(e.target.value)} placeholder="(512) 555-0123" required type="tel" value={phone} />
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="habit">What do you want to quit?</label>
        <select className={inputClass} id="habit" onChange={(e) => setHabit(e.target.value)} required value={habit}>
          <option disabled value="">Pick one</option>
          {options.map((h) => (
            <option key={h.slug} value={h.slug}>{h.slug === "other" ? "Something else" : h.name}</option>
          ))}
        </select>
      </div>

      {habit === "other" ? (
        <div>
          <label className={labelClass} htmlFor="customHabit">Tell us what, in a few words</label>
          <input className={inputClass} id="customHabit" maxLength={60} onChange={(e) => setCustomHabit(e.target.value)} placeholder="Like: energy drinks" required value={customHabit} />
        </div>
      ) : null}

      {/* Hidden from people; bots that fill it in are ignored. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Website</label>
        <input autoComplete="off" id="website" onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} value={website} />
      </div>

      <label className="flex items-start gap-3 text-sm leading-6 text-white/85">
        <input checked={consent} className="mt-0.5 h-5 w-5 shrink-0 accent-[#4aa23a]" onChange={(e) => setConsent(e.target.checked)} required type="checkbox" />
        <span>
          I agree to receive recurring automated text messages from Consumption Diet at this number: about 2 a day for 30 days, plus replies when I text. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to cancel, HELP for help. See our{" "}
          <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy Policy</a>.
        </span>
      </label>

      <button
        className="min-h-14 rounded-sm bg-[#2f7d24] px-6 text-lg font-semibold text-white transition hover:bg-[#25651c] focus:outline-none focus:ring-2 focus:ring-[#4aa23a] focus:ring-offset-2 focus:ring-offset-[#061f34] disabled:cursor-not-allowed disabled:bg-stone-500"
        disabled={busy}
        type="submit"
      >
        {busy ? "One moment..." : "Start my free week"}
      </button>

      <div aria-live="polite" className="min-h-6">
        {error ? <p className="text-base font-medium text-[#ffb4b4]">{error}</p> : null}
      </div>
    </form>
  );
}
