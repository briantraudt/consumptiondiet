import {
  Dumbbell,
  Goal,
  MonitorPlay,
  Smartphone,
  Utensils,
  Users,
  Wine,
} from "lucide-react";
import Image from "next/image";
import { ChallengeSignupForm } from "@/components/challenge-signup-form";
import { challengeDays } from "@/lib/challenge";

const consumptionAreas = [
  { label: "TV", tone: "less" },
  { label: "social media", tone: "less" },
  { label: "phone use", tone: "less" },
  { label: "news", tone: "less" },
  { label: "sugar and junk food", tone: "less" },
  { label: "unnecessary buying", tone: "less" },
  { label: "mental noise", tone: "more" },
];

const heroCategories = [
  { label: "Purpose", icon: Goal, tone: "more" },
  { label: "Health", icon: Dumbbell, tone: "more" },
  { label: "Relationships", icon: Users, tone: "more" },
  { label: "Food", icon: Utensils, tone: "less" },
  { label: "Alcohol", icon: Wine, tone: "less" },
  { label: "Media", icon: MonitorPlay, tone: "less" },
  { label: "Tech", icon: Smartphone, tone: "less" },
];

export default function Home() {
  return (
    <main>
      <section className="bg-white text-[#061f34]">
        <div className="border-b border-[#dbe4ea]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8 lg:px-10">
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
            <a
              className="hidden text-sm font-semibold uppercase tracking-[0.16em] text-[#061f34]/70 transition hover:text-[#061f34] sm:inline"
              href="#signup"
            >
              Join
            </a>
          </div>
        </div>

        <div className="relative min-h-[86vh] overflow-hidden">
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

          <div className="relative mx-auto flex min-h-[86vh] max-w-6xl items-center px-6 py-16 sm:px-8 lg:px-10 lg:py-20">
            <div className="max-w-3xl border-l-2 border-[#4aa23a] pl-6 sm:pl-8">
              <h1 className="max-w-4xl text-balance text-6xl font-semibold leading-[0.93] text-white drop-shadow-sm sm:text-7xl lg:text-8xl">
                Consume{" "}
                <span className="text-[#ef2d2d]">Less.</span>
                <br />
                Live <span className="text-[#4aa23a]">More.</span>
              </h1>
              <p className="mt-8 max-w-2xl text-pretty text-xl leading-8 text-white/90 sm:text-2xl sm:leading-9">
                A simple challenge to reduce noise, distraction, and excess so
                you can regain clarity, discipline, and purpose.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#signup"
                  className="inline-flex min-h-12 items-center justify-center rounded-sm bg-white px-6 text-base font-semibold text-[#061f34] shadow-sm transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#061f34]"
                >
                  Start the 7-Day Consumption Diet
                </a>
                <a
                  href="#story"
                  className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white/60 px-6 text-base font-semibold text-white transition hover:border-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#061f34]"
                >
                  Read the story
                </a>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 bg-[#061f34]/90 text-white backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl justify-between gap-8 overflow-x-auto px-6 sm:px-8 lg:px-10">
              {heroCategories.map(({ icon: Icon, label, tone }) => (
                <div
                  className="flex min-w-max items-center justify-center gap-3 py-4 text-sm font-semibold uppercase tracking-[0.16em] sm:py-5 lg:flex-1"
                  key={label}
                >
                  <span
                    className={
                      tone === "more"
                        ? "flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#4aa23a] text-[#4aa23a]"
                        : "flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#ef2d2d] text-[#ef2d2d]"
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
      </section>

      <section className="bg-white px-6 py-24 sm:px-8 lg:px-10" id="what">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4aa23a]">
              What it is
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#061f34] sm:text-5xl">
              The problem is not just what we eat. It is everything we consume.
            </h2>
          </div>
          <div className="space-y-7 text-lg leading-8 text-stone-700">
            <p>
              Consumption Diet is not just about food. It is a practical reset
              for the inputs that crowd the mind, weaken attention, and make
              normal life feel noisy.
            </p>
            <p>
              The aim is simple: remove enough excess to notice what is shaping
              you, then choose what deserves a place in your life.
            </p>
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              {consumptionAreas.map((area) => (
                <div
                  className={
                    area.tone === "more"
                      ? "border-l-2 border-[#4aa23a] bg-[#f3f8f1] px-4 py-3 text-base font-medium text-[#061f34]"
                      : "border-l-2 border-[#ef2d2d] bg-[#fff5f5] px-4 py-3 text-base font-medium text-[#061f34]"
                  }
                  key={area.label}
                >
                  {area.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dbe4ea] bg-[#f7fafb] px-6 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ef2d2d]">
              7-Day Challenge
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#061f34] sm:text-5xl">
              Seven small removals. One honest reset.
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden border border-[#dbe4ea] bg-[#dbe4ea] md:grid-cols-2 lg:grid-cols-7">
            {challengeDays.map((day) => (
              <article className="bg-white p-6" key={day.day}>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#4aa23a]">
                  Day {day.day}
                </p>
                <h3 className="mt-4 text-xl font-semibold text-[#061f34]">
                  {day.title}
                </h3>
                <p className="mt-4 text-base leading-7 text-stone-600">
                  {day.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24 sm:px-8 lg:px-10" id="story">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4aa23a]">
              About
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#061f34] sm:text-5xl">
              A personal experiment in making room.
            </h2>
          </div>
          <div className="space-y-7 text-lg leading-8 text-stone-700">
            <p>
              Consumption Diet was started after realizing that modern life is
              not only overfed, but overloaded.
            </p>
            <p>
              After a heart attack, quitting alcohol, job loss, and a season of
              rebuilding, this became a personal experiment in removing what was
              unnecessary to make room for what matters.
            </p>
            <p>
              This is not meant to sound polished or heroic. It is just a place
              to practice clarity, discipline, faith, and purpose in public.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-[#dbe4ea] bg-[#061f34] px-6 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-3xl text-2xl font-semibold leading-tight sm:text-3xl">
            Remove what drains attention. Keep what builds purpose, health,
            relationships, and faith.
          </p>
          <a
            className="inline-flex min-h-12 items-center justify-center rounded-sm bg-white px-6 text-base font-semibold text-[#061f34] transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#061f34]"
            href="#signup"
          >
            Begin the reset
          </a>
        </div>
      </section>

      <section
        className="border-t border-[#dbe4ea] bg-white px-6 py-24 sm:px-8 lg:px-10"
        id="signup"
      >
        <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ef2d2d]">
              Start here
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-[#061f34] sm:text-5xl">
              Join the 7-Day Challenge.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-stone-700">
              Add your name and email. For this MVP, your signup is captured by
              a simple API route while the public email sequence is prepared.
            </p>
          </div>
          <ChallengeSignupForm />
        </div>
      </section>
    </main>
  );
}
