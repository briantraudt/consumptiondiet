import {
  Crosshair,
  Dumbbell,
  Smartphone,
  SquarePlay,
  UsersRound,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import Image from "next/image";
import { ChallengeSignupForm } from "@/components/challenge-signup-form";

const heroCategories = [
  { label: "Purpose", icon: Crosshair, tone: "more" },
  { label: "Health", icon: Dumbbell, tone: "more" },
  { label: "Relationships", icon: UsersRound, tone: "more" },
  { label: "Food", icon: UtensilsCrossed, tone: "less" },
  { label: "Alcohol", icon: Wine, tone: "less" },
  { label: "Media", icon: SquarePlay, tone: "less" },
  { label: "Tech", icon: Smartphone, tone: "less" },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#061f34]">
      <section className="bg-white text-[#061f34]">
        <div className="border-b border-[#dbe4ea]">
          <div className="mx-auto flex max-w-6xl items-center px-6 py-5 sm:px-8 lg:px-10">
            <a className="block" href="#" aria-label="Consumption Diet home">
              <Image
                alt="Consumption Diet"
                className="h-auto w-56 sm:w-72"
                height={167}
                priority
                src="/brand/consumption-diet-logo-horizontal.png"
                width={1809}
              />
            </a>
          </div>
        </div>

        <div className="relative min-h-[calc(100vh-81px)] overflow-hidden">
          <Image
            alt="Open road through a quiet desert landscape"
            className="absolute inset-0 h-full w-full object-cover object-[58%_55%]"
            fill
            priority
            sizes="100vw"
            src="/brand/hero-quiet-landscape.jpg"
          />
          <div className="absolute inset-0 bg-[#061f34]/28" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#061f34]/88 via-[#061f34]/48 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#061f34]/70 to-transparent" />

          <div className="relative mx-auto flex min-h-[calc(100vh-81px)] max-w-6xl items-center px-6 pb-44 pt-12 sm:px-8 sm:pb-36 lg:px-10 lg:py-20">
            <div className="max-w-3xl border-l-2 border-[#4aa23a] pl-5 sm:pl-8">
              <h1 className="max-w-4xl text-balance text-[clamp(2.9rem,12vw,5rem)] font-semibold leading-[0.93] text-white drop-shadow-sm sm:text-7xl lg:text-8xl">
                <span className="whitespace-nowrap">Consume Less.</span>
                <br />
                Live More.
              </h1>
              <p className="mt-8 max-w-2xl text-pretty text-xl leading-8 text-white/90 sm:text-2xl sm:leading-9">
                A simple challenge to reduce noise, distraction, and excess so
                you can regain clarity, discipline, and purpose.
              </p>
              <div className="mt-10 max-w-xl">
                <ChallengeSignupForm />
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-[#061f34]/90 text-white backdrop-blur-md">
            <div className="mx-auto max-w-6xl overflow-x-auto px-4 py-4 sm:px-8 sm:py-0 lg:px-10">
              <div className="flex min-w-max justify-between gap-8 sm:min-w-0">
                {heroCategories.map(({ icon: Icon, label, tone }) => (
                  <div
                    className="flex min-w-max items-center justify-center gap-3 py-2 text-sm font-semibold uppercase tracking-[0.16em] sm:flex-1 sm:py-5"
                    key={label}
                  >
                    <span
                      className={
                        tone === "more"
                          ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#4aa23a] text-[#4aa23a]"
                          : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-[#ef2d2d] text-[#ef2d2d]"
                      }
                    >
                      <Icon aria-hidden="true" size={22} strokeWidth={2.2} />
                    </span>
                    <span className="text-white/90">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
