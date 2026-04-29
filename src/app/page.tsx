import {
  Dumbbell,
  Goal,
  MonitorPlay,
  Smartphone,
  UsersRound,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import Image from "next/image";
import { ChallengeSignupForm } from "@/components/challenge-signup-form";

const lessItems = [
  { label: "Food", icon: UtensilsCrossed },
  { label: "Alcohol", icon: Wine },
  { label: "Media", icon: MonitorPlay },
  { label: "Tech", icon: Smartphone },
];

const moreItems = [
  { label: "Purpose", icon: Goal },
  { label: "Health", icon: Dumbbell },
  { label: "Relationships", icon: UsersRound },
];

function Headline({ compact = false }: { compact?: boolean }) {
  return (
    <h1
      className={
        compact
          ? "text-center text-5xl font-black leading-none tracking-tight sm:text-7xl"
          : "text-[clamp(4.5rem,15vw,10rem)] font-black leading-[0.8] tracking-tight"
      }
    >
      <span className="block text-[#E53935]">LESS</span>
      <span className="block text-[#0B2A44] [text-shadow:0_1px_18px_rgba(255,255,255,0.5)]">
        IS
      </span>
      <span className="block text-[#2E7D32]">MORE</span>
    </h1>
  );
}

export default function Home() {
  return (
    <main className="bg-white text-[#0B2A44]">
      <section className="relative min-h-screen overflow-hidden" id="top">
        <Image
          alt="A man walking beside a quiet mountain lake at sunrise"
          className="absolute inset-0 h-full w-full object-cover object-center"
          fill
          priority
          sizes="100vw"
          src="/brand/hero-lake-sunrise.jpg"
        />
        <div className="absolute inset-0 bg-[#0B2A44]/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/38 to-black/10" />

        <div className="absolute left-5 top-5 z-20 sm:left-8 sm:top-7">
          <Image
            alt="Consumption Diet"
            className="h-auto w-44 sm:w-56"
            height={167}
            priority
            src="/brand/consumption-diet-logo-horizontal.png"
            width={1809}
          />
        </div>

        <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-5 py-28 sm:px-8 lg:justify-end lg:px-12">
          <div className="w-full max-w-2xl lg:mr-10">
            <Headline />
            <p className="mt-8 max-w-xl text-pretty text-2xl font-medium leading-snug text-white sm:text-3xl">
              Remove what doesn&apos;t matter so you can focus on what does.
            </p>
            <div className="mt-10 max-w-md">
              <ChallengeSignupForm />
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              What we cut:
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {lessItems.map(({ icon: Icon, label }) => (
                <div className="grid justify-items-center gap-4" key={label}>
                  <Icon
                    aria-hidden="true"
                    className="h-12 w-12 text-[#E53935]"
                    strokeWidth={1.8}
                  />
                  <p className="text-xl font-bold text-[#E53935]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-24 text-center">
            <h2 className="text-3xl font-black tracking-tight sm:text-5xl">
              What you gain:
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {moreItems.map(({ icon: Icon, label }) => (
                <div className="grid justify-items-center gap-4" key={label}>
                  <Icon
                    aria-hidden="true"
                    className="h-12 w-12 text-[#2E7D32]"
                    strokeWidth={1.8}
                  />
                  <p className="text-xl font-bold text-[#2E7D32]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f7f5f0] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-2xl font-semibold leading-snug text-[#0B2A44] sm:text-3xl">
            I started the Consumption Diet after a heart attack, quitting
            alcohol, and realizing I was overloaded in every area of life. This
            is a simple system to remove what doesn&apos;t matter.
          </p>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8 sm:py-32 lg:px-12">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-10 text-center">
          <Headline compact />
          <a
            className="inline-flex min-h-14 items-center justify-center rounded-sm bg-[#2E7D32] px-8 text-lg font-bold text-white transition hover:bg-[#276b2b] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:ring-offset-4"
            href="#top"
          >
            Start the 7-Day Consumption Diet
          </a>
        </div>
      </section>
    </main>
  );
}
