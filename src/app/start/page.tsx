import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { smsNumber } from "@/lib/config";

export const metadata: Metadata = {
  title: "Start your 30 days | Consumption Diet",
  description: "Text BEGIN to start. Quit one habit in 30 days with a daily text, an evening check-in, and a coach when it gets hard.",
};
export const dynamic = "force-dynamic";

const steps = [
  { title: "Text BEGIN", body: "Tell us the one habit you want to quit, in your own words. It takes about a minute." },
  { title: "Get one text each morning", body: "One clear thing to do that day. Pick the times that work for you." },
  { title: "Check in each night", body: "Reply Y or N. A slip doesn't reset anything. Hard moment? Text back and your AI coach answers." },
];

export default function StartPage() {
  const number = smsNumber();

  return (
    <PageShell>
      <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl">Quit one thing. 30 days.</h1>
      <p className="mt-5 text-lg leading-7 text-white/85">
        It all happens by text. No app, no account, no card to start.
      </p>

      <div className="mt-8 border-l-2 border-[#4aa23a] pl-5">
        {number ? (
          <>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-white/70">To start, text</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">BEGIN</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white/90">to {number.display}</p>
            <a
              className="mt-6 inline-flex min-h-14 items-center justify-center rounded-sm bg-[#2f7d24] px-8 text-lg font-semibold text-white transition hover:bg-[#25651c] focus:outline-none focus:ring-2 focus:ring-[#4aa23a] focus:ring-offset-2 focus:ring-offset-[#061f34] sm:hidden"
              href={`sms:${number.e164}?&body=BEGIN`}
            >
              Open my messages
            </a>
          </>
        ) : (
          <p className="text-xl font-semibold">We&apos;re opening soon. Check back in a few days.</p>
        )}
        <p className="mt-5 text-base text-white/80">First 7 days free. Then $31 for the full 30 days, about $1 a day.</p>
      </div>

      <ol className="mt-12 grid gap-6">
        {steps.map((step, i) => (
          <li className="flex gap-4" key={step.title}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[#4aa23a] text-base font-semibold text-[#4aa23a]">
              {i + 1}
            </span>
            <div>
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="mt-1 leading-7 text-white/80">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-12 text-sm leading-6 text-white/65">
        By texting BEGIN you ask Consumption Diet to text you back. You&apos;ll be asked to reply YES before any
        recurring texts start: about 2 a day for 30 days, plus replies when you text. Message and data rates may
        apply. Reply STOP to cancel, HELP for help. For adults 18 and over in the US. The coach is an AI, not a
        person, and this is not medical care. See our{" "}
        <a className="underline" href="/terms">Terms</a> and <a className="underline" href="/privacy">Privacy Policy</a>.
      </p>
    </PageShell>
  );
}
