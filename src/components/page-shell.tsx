import Image from "next/image";
import Link from "next/link";

/** Shared frame for every page after the homepage: navy background, logo, one column. */
export function PageShell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#061f34] text-white">
      <div className={`mx-auto px-5 pb-16 pt-8 sm:px-8 ${wide ? "max-w-4xl" : "max-w-xl"}`}>
        <Link className="inline-block" href="/" aria-label="Consumption Diet home">
          <Image
            alt="Consumption Diet"
            className="h-auto w-52 opacity-95"
            height={167}
            priority
            src="/brand/consumption-diet-logo-hero-mobile.png"
            width={1809}
          />
        </Link>
        <div className="mt-10">{children}</div>
        <footer className="mt-16 flex gap-5 border-t border-white/15 pt-5 text-sm text-white/60">
          <Link className="underline-offset-4 hover:underline" href="/terms">Terms</Link>
          <Link className="underline-offset-4 hover:underline" href="/privacy">Privacy</Link>
        </footer>
      </div>
    </main>
  );
}
