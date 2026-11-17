import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { SignupForm } from "@/components/signup-form";
import { smsNumber } from "@/lib/config";

export const metadata: Metadata = {
  title: "Start your 30 days | Consumption Diet",
  description: "Quit one habit in 30 days with a daily text, an evening check-in, and a coach when it gets hard.",
};
export const dynamic = "force-dynamic";

const steps = [
  { title: "Sign up, then reply to our text", body: "A few quick questions by text set your start date and times. It takes about a minute." },
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

      <p className="mt-3 text-base text-white/80">First 7 days free. Then $31 for the full 30 days, about $1 a day.</p>

      <div className="mt-8">
        <SignupForm />
      </div>

      {number ? (
        <p className="mt-2 text-base text-white/80">
          Or skip the form: text <span className="font-semibold text-white">BEGIN</span> to{" "}
          <a className="font-semibold text-white underline" href={`sms:${number.e164}?&body=BEGIN`}>{number.display}</a>.
        </p>
      ) : null}

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
        For adults 18 and over in the US. The coach is an AI, not a person, and this is not medical care.
      </p>
    </PageShell>
  );
}
