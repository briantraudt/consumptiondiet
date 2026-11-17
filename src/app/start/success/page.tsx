import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Payment received | Consumption Diet", robots: { index: false } };

export default function SuccessPage() {
  return (
    <PageShell>
      <div className="border-l-2 border-[#4aa23a] pl-5">
        <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">You&apos;re set.</h1>
        <p className="mt-5 text-lg leading-7 text-white/90">
          Payment received. Thank you. A text confirming it is on its way.
        </p>
        <p className="mt-4 text-lg leading-7 text-white/90">You can close this page. Everything else happens by text.</p>
      </div>
    </PageShell>
  );
}
