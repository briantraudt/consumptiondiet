import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { StartForm } from "@/components/start-form";
import { challengePriceCents, launchDate } from "@/lib/config";

export const metadata: Metadata = {
  title: "Start your 30 days | Consumption Diet",
  description: "Pick one habit to quit. Get a daily text, an evening check-in, and a coach when it gets hard.",
};

export default function StartPage() {
  const cents = challengePriceCents();
  const priceLabel = cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;

  return (
    <PageShell>
      <h1 className="text-balance text-4xl font-semibold leading-tight sm:text-5xl">
        Quit one thing. 30 days.
      </h1>
      <p className="mt-5 text-lg leading-7 text-white/85">
        A text each morning with one thing to do. A check-in each night. A coach by text when it gets hard. No app.
      </p>
      <div className="mt-10">
        <StartForm launchDate={launchDate()} priceLabel={priceLabel} />
      </div>
    </PageShell>
  );
}
