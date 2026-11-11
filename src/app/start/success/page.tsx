import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "You're in | Consumption Diet",
  robots: { index: false },
};

export default function SuccessPage() {
  return (
    <PageShell>
      <div className="border-l-2 border-[#4aa23a] pl-5">
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">You&apos;re in.</h1>
        <p className="mt-5 text-lg leading-7 text-white/90">
          Check your phone. A welcome text is on its way with your start date.
        </p>
        <p className="mt-4 text-lg leading-7 text-white/90">
          Save the number. On a hard day, text it anything and your coach will answer.
        </p>
      </div>
    </PageShell>
  );
}
