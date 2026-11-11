"use client";

import { FormEvent, useMemo, useState } from "react";
import { HABITS, SCREENING } from "@/lib/habits";

type Referral = { title: string; message: string; helpline: string };

const MORNING_TIMES = ["05:00", "05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00"];
const EVENING_TIMES = ["17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"];

function label12h(time: string) {
  const [h, m] = time.split(":").map(Number);
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function localDateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const inputClass =
  "min-h-12 w-full rounded-sm border border-white/20 bg-white px-4 text-base font-medium text-[#061f34] outline-none placeholder:text-stone-400 focus:ring-2 focus:ring-[#4aa23a]";
const labelClass = "mb-2 block text-sm font-semibold text-white/90";

export function StartForm({ priceLabel, launchDate }: { priceLabel: string; launchDate: string }) {
  const earliest = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const t = localDateString(tomorrow);
    return t > launchDate ? t : launchDate;
  }, [launchDate]);

  const [habit, setHabit] = useState("");
  const [customHabit, setCustomHabit] = useState("");
  const [screening, setScreening] = useState<Record<string, boolean>>({});
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState(earliest);
  const [morningTime, setMorningTime] = useState("07:00");
  const [eveningTime, setEveningTime] = useState("20:00");
  const [wantsPartner, setWantsPartner] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [partnerPhone, setPartnerPhone] = useState("");
  const [showHabit, setShowHabit] = useState(false);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [referral, setReferral] = useState<Referral | null>(null);

  const questions = SCREENING[habit] ?? [];
  const screeningDone = questions.every((q) => typeof screening[q.id] === "boolean");
  const habitReady = habit !== "" && (habit !== "other" || customHabit.trim().length >= 2);
  const showDetails = habitReady && screeningDone;

  function pickHabit(slug: string) {
    setHabit(slug);
    setScreening({});
    setError("");
    setNotice("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          phone,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          habit,
          customHabit: habit === "other" ? customHabit : undefined,
          screening,
          startDate,
          morningTime,
          eveningTime,
          consent,
          partner: wantsPartner ? { name: partnerName, phone: partnerPhone, showHabit } : null,
        }),
      });
      const result = (await response.json()) as {
        message?: string;
        checkoutUrl?: string;
        referral?: Referral;
        mappedTo?: string;
      };

      if (result.referral) {
        setReferral(result.referral);
        return;
      }
      if (result.mappedTo) {
        const mapped = HABITS.find((h) => h.slug === result.mappedTo);
        pickHabit(result.mappedTo);
        setNotice(
          `That fits our ${mapped?.name ?? "existing"} challenge, so we moved you there. ${
            (SCREENING[result.mappedTo] ?? []).length ? "Answer the questions below, then continue." : "Press continue again."
          }`,
        );
        return;
      }
      if (!response.ok || !result.checkoutUrl) {
        throw new Error(result.message ?? "Something went wrong. Please try again.");
      }
      window.location.assign(result.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (referral) {
    return (
      <div className="border-l-2 border-[#4aa23a] pl-5" role="alert">
        <h2 className="text-3xl font-semibold leading-tight">{referral.title}</h2>
        <p className="mt-4 text-lg leading-7 text-white/90">{referral.message}</p>
        {referral.helpline ? (
          <p className="mt-4 text-lg font-semibold leading-7">{referral.helpline}</p>
        ) : null}
        <p className="mt-4 text-white/70">You have not been charged.</p>
        <button
          className="mt-8 min-h-12 rounded-sm border border-white/30 px-5 text-base font-semibold hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#4aa23a]"
          onClick={() => {
            setReferral(null);
            pickHabit("");
            setCustomHabit("");
          }}
          type="button"
        >
          Pick a different habit
        </button>
      </div>
    );
  }

  return (
    <form className="grid gap-10" onSubmit={handleSubmit}>
      <fieldset>
        <legend className="text-xl font-semibold">1. What are you quitting?</legend>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {HABITS.map((h) => (
            <button
              aria-pressed={habit === h.slug}
              className={`min-h-12 rounded-sm border px-3 text-left text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#4aa23a] ${
                habit === h.slug
                  ? "border-[#4aa23a] bg-[#2f7d24] text-white"
                  : "border-white/25 bg-white/5 text-white hover:bg-white/10"
              }`}
              key={h.slug}
              onClick={() => pickHabit(h.slug)}
              type="button"
            >
              {h.name}
            </button>
          ))}
        </div>
        {habit === "other" ? (
          <div className="mt-4">
            <label className={labelClass} htmlFor="customHabit">What do you want to quit?</label>
            <input
              className={inputClass}
              id="customHabit"
              maxLength={60}
              onChange={(e) => setCustomHabit(e.target.value)}
              placeholder="A few words, like energy drinks"
              value={customHabit}
            />
          </div>
        ) : null}
        {notice ? <p className="mt-4 text-sm font-medium text-white" role="status">{notice}</p> : null}
      </fieldset>

      {habitReady && questions.length > 0 ? (
        <fieldset>
          <legend className="text-xl font-semibold">2. A few quick questions</legend>
          <p className="mt-2 text-sm text-white/70">These keep you safe. Your answers are not stored.</p>
          <div className="mt-4 grid gap-5">
            {questions.map((q) => (
              <div key={q.id} role="group" aria-labelledby={`q-${q.id}`}>
                <p className="text-base leading-6 text-white/90" id={`q-${q.id}`}>{q.text}</p>
                <div className="mt-2 flex gap-2">
                  {[true, false].map((value) => (
                    <button
                      aria-pressed={screening[q.id] === value}
                      className={`min-h-11 min-w-20 rounded-sm border px-4 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#4aa23a] ${
                        screening[q.id] === value
                          ? "border-[#4aa23a] bg-[#2f7d24]"
                          : "border-white/25 bg-white/5 hover:bg-white/10"
                      }`}
                      key={String(value)}
                      onClick={() => setScreening((s) => ({ ...s, [q.id]: value }))}
                      type="button"
                    >
                      {value ? "Yes" : "No"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
      ) : null}

      {showDetails ? (
        <>
          <fieldset className="grid gap-4">
            <legend className="text-xl font-semibold">{questions.length ? "3" : "2"}. Where should we text you?</legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass} htmlFor="firstName">First name</label>
                <input autoComplete="given-name" className={inputClass} id="firstName" maxLength={40} onChange={(e) => setFirstName(e.target.value)} required value={firstName} />
              </div>
              <div>
                <label className={labelClass} htmlFor="phone">Mobile number (US)</label>
                <input autoComplete="tel" className={inputClass} id="phone" inputMode="tel" onChange={(e) => setPhone(e.target.value)} placeholder="(512) 555-0123" required type="tel" value={phone} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="startDate">Start date</label>
                <input className={inputClass} id="startDate" min={earliest} onChange={(e) => setStartDate(e.target.value)} required type="date" value={startDate} />
              </div>
              <div>
                <label className={labelClass} htmlFor="morningTime">Morning text</label>
                <select className={inputClass} id="morningTime" onChange={(e) => setMorningTime(e.target.value)} value={morningTime}>
                  {MORNING_TIMES.map((t) => <option key={t} value={t}>{label12h(t)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="eveningTime">Evening check-in</label>
                <select className={inputClass} id="eveningTime" onChange={(e) => setEveningTime(e.target.value)} value={eveningTime}>
                  {EVENING_TIMES.map((t) => <option key={t} value={t}>{label12h(t)}</option>)}
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xl font-semibold">{questions.length ? "4" : "3"}. Add an accountability partner</legend>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Optional. One person who gets a short text if you miss a day, plus a Sunday summary. We ask them first.
            </p>
            <label className="mt-4 flex min-h-11 items-center gap-3 text-base">
              <input checked={wantsPartner} className="h-5 w-5 accent-[#4aa23a]" onChange={(e) => setWantsPartner(e.target.checked)} type="checkbox" />
              Yes, add a partner
            </label>
            {wantsPartner ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="partnerName">Their first name</label>
                  <input className={inputClass} id="partnerName" maxLength={40} onChange={(e) => setPartnerName(e.target.value)} required value={partnerName} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="partnerPhone">Their mobile number (US)</label>
                  <input className={inputClass} id="partnerPhone" inputMode="tel" onChange={(e) => setPartnerPhone(e.target.value)} required type="tel" value={partnerPhone} />
                </div>
                <label className="flex items-start gap-3 text-base leading-6 sm:col-span-2">
                  <input checked={showHabit} className="mt-0.5 h-5 w-5 shrink-0 accent-[#4aa23a]" onChange={(e) => setShowHabit(e.target.checked)} type="checkbox" />
                  <span>Tell them which habit I&apos;m quitting. If unchecked, they only see &quot;30-day challenge.&quot;</span>
                </label>
              </div>
            ) : null}
          </fieldset>

          <div className="grid gap-5">
            <label className="flex items-start gap-3 text-sm leading-6 text-white/85">
              <input checked={consent} className="mt-0.5 h-5 w-5 shrink-0 accent-[#4aa23a]" onChange={(e) => setConsent(e.target.checked)} required type="checkbox" />
              <span>
                I agree to receive recurring automated text messages from Consumption Diet at this number: about 2 a day for 30 days, plus replies when I text. Message and data rates may apply. Reply STOP to cancel, HELP for help. See our{" "}
                <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy Policy</a>.
              </span>
            </label>

            <button
              className="min-h-14 rounded-sm bg-[#2f7d24] px-6 text-lg font-semibold text-white transition hover:bg-[#25651c] focus:outline-none focus:ring-2 focus:ring-[#4aa23a] focus:ring-offset-2 focus:ring-offset-[#061f34] disabled:cursor-not-allowed disabled:bg-stone-500"
              disabled={busy}
              type="submit"
            >
              {busy ? "One moment..." : `Continue to payment: ${priceLabel}`}
            </button>
            <p className="text-sm text-white/70">One payment for all 30 days. No subscription.</p>
          </div>
        </>
      ) : null}

      <div aria-live="polite" className="min-h-6">
        {error ? <p className="text-base font-medium text-[#ffb4b4]">{error}</p> : null}
      </div>
    </form>
  );
}
