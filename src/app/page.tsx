import {
  Crosshair,
  Dumbbell,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import { ChallengeSignupForm } from "@/components/challenge-signup-form";

const heroCategories = [
  { label: "Purpose", icon: Crosshair },
  { label: "Health", icon: Dumbbell },
  {
    label: "Relationships",
    icon: UsersRound,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#061f34]">
      <section className="bg-[#061f34] text-[#061f34]">
        <div className="relative min-h-screen overflow-hidden">
          <Image
            alt="Quiet beach with open sky and a distant person walking near the water"
            className="absolute inset-0 h-full w-full object-cover object-[50%_58%]"
            fill
            priority
            sizes="100vw"
            src="/brand/hero-empty-beach.jpg"
          />
          <div className="absolute inset-0 bg-[#061f34]/26" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#061f34]/92 via-[#061f34]/58 to-[#061f34]/18" />
          <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#061f34]/70 to-transparent" />

          <div className="absolute left-0 right-0 top-12 z-20 flex justify-center px-6 sm:left-8 sm:right-auto sm:top-8 sm:block sm:px-0 lg:left-10">
            <a className="block" href="#" aria-label="Consumption Diet home">
              <Image
                alt="Consumption Diet"
                className="h-auto w-72 opacity-95 sm:w-72"
                height={167}
                priority
                src="/brand/consumption-diet-logo-hero-mobile.png"
                width={1809}
              />
            </a>
          </div>

          <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 pb-52 pt-28 sm:px-8 sm:pb-36 lg:px-10 lg:py-24">
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

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#061f34]/82 via-[#061f34]/42 to-transparent text-white sm:bg-[#061f34]/90 sm:backdrop-blur-md">
            <div className="mx-auto max-w-6xl px-3 pb-5 pt-12 sm:px-8 sm:py-0 lg:px-10">
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-5 sm:flex-nowrap sm:justify-between sm:gap-8">
                {heroCategories.map(({ icon: Icon, label }) => (
                  <div
                    className="flex shrink-0 basis-[28%] flex-col items-center justify-center gap-2 text-center text-[0.6rem] font-semibold uppercase tracking-[0.06em] sm:min-w-max sm:basis-auto sm:flex-1 sm:flex-row sm:gap-3 sm:py-5 sm:text-sm sm:tracking-[0.16em]"
                    key={label}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white text-white sm:h-10 sm:w-10">
                      <Icon
                        aria-hidden="true"
                        className="h-5 w-5 sm:h-[22px] sm:w-[22px]"
                        strokeWidth={2.2}
                      />
                    </span>
                    <span className="max-w-full text-white/90">
                      {label}
                    </span>
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
