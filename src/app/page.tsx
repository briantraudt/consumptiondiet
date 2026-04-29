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

export default function Home() {
  return (
    <main>
      <section className="relative min-h-[92vh] overflow-hidden bg-[#061f34] text-white">
        <Image
          alt="Consumption Diet brand over a mountain lake at sunrise"
          className="absolute inset-0 h-full w-full object-cover"
          fill
          priority
          sizes="100vw"
          src="/brand/consumption-diet-hero.png"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#061f34]/95 via-[#061f34]/70 to-[#061f34]/25" />
        <div className="absolute inset-x-0 top-0 z-10 border-b border-white/15">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 sm:px-8 lg:px-10">
            <a className="flex items-center gap-3" href="#">
              <Image
                alt=""
                aria-hidden="true"
                className="h-10 w-10 rounded-full object-cover"
                height={80}
                src="/brand/consumption-diet-mark.png"
                width={80}
              />
              <span className="text-sm font-semibold uppercase tracking-[0.22em]">
                Consumption Diet
              </span>
            </a>
            <a
              className="hidden text-sm font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:text-white sm:inline"
              href="#signup"
            >
              Join
            </a>
          </div>
        </div>
        <div className="relative z-10 mx-auto flex min-h-[92vh] max-w-6xl flex-col justify-end px-6 pb-16 pt-28 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="mb-6 text-sm font-semibold uppercase tracking-[0.22em] text-[#4aa23a]">
              Less noise. More life.
            </p>
            <h1 className="text-balance text-6xl font-semibold leading-[0.95] text-white sm:text-7xl lg:text-8xl">
              Consume Less. Live Better.
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-xl leading-8 text-white/85 sm:text-2xl sm:leading-9">
              A simple challenge to reduce noise, distraction, and excess so
              you can regain clarity, discipline, and purpose.
            </p>
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href="#signup"
              className="inline-flex min-h-12 items-center justify-center rounded-sm bg-white px-6 text-base font-semibold text-[#061f34] transition hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#061f34]"
            >
              Start the 7-Day Consumption Diet
            </a>
            <a
              href="#story"
              className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white/50 px-6 text-base font-semibold text-white transition hover:border-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#061f34]"
            >
              Read the story
            </a>
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
              Consumption Diet was started by Brian Traudt after realizing that
              modern life is not only overfed, but overloaded.
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

      <section className="border-y border-white/10 bg-[#061f34] px-6 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-sm">
            <Image
              alt="Consumption Diet logo"
              className="h-auto w-full"
              height={1024}
              src="/brand/consumption-diet-logo-lockup.png"
              width={1536}
            />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#4aa23a]">
              Less is more
            </p>
            <p className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Remove what drains attention. Keep what builds purpose, health,
              relationships, and faith.
            </p>
          </div>
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
