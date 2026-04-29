import { ChallengeSignupForm } from "@/components/challenge-signup-form";
import { challengeDays } from "@/lib/challenge";

const consumptionAreas = [
  "TV",
  "social media",
  "phone use",
  "news",
  "sugar and junk food",
  "unnecessary buying",
  "mental noise",
];

export default function Home() {
  return (
    <main>
      <section className="border-b border-stone-200 bg-[#f8f5ef]">
        <div className="mx-auto flex min-h-[90vh] max-w-6xl flex-col justify-center px-6 py-12 sm:px-8 lg:px-10">
          <p className="mb-8 text-sm font-semibold uppercase tracking-[0.18em] text-[#7d5131]">
            Consumption Diet
          </p>
          <div className="max-w-4xl">
            <h1 className="text-balance text-6xl font-semibold leading-[0.95] text-stone-950 sm:text-7xl lg:text-8xl">
              Consume Less. Live Better.
            </h1>
            <p className="mt-8 max-w-2xl text-pretty text-xl leading-8 text-stone-700 sm:text-2xl sm:leading-9">
              A simple challenge to reduce noise, distraction, and excess so
              you can regain clarity, discipline, and purpose.
            </p>
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href="#signup"
              className="inline-flex min-h-12 items-center justify-center rounded-sm bg-stone-950 px-6 text-base font-semibold text-white transition hover:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-950 focus:ring-offset-2"
            >
              Start the 7-Day Consumption Diet
            </a>
            <a
              href="#story"
              className="inline-flex min-h-12 items-center justify-center rounded-sm border border-stone-400 px-6 text-base font-semibold text-stone-950 transition hover:border-stone-950 hover:bg-white focus:outline-none focus:ring-2 focus:ring-stone-950 focus:ring-offset-2"
            >
              Read the story
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white px-6 py-24 sm:px-8 lg:px-10" id="what">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7d5131]">
              What it is
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
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
                  className="border-l-2 border-[#a36f42] bg-stone-50 px-4 py-3 text-base font-medium text-stone-800"
                  key={area}
                >
                  {area}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-stone-200 bg-stone-50 px-6 py-24 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7d5131]">
              7-Day Challenge
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
              Seven small removals. One honest reset.
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden border border-stone-200 bg-stone-200 md:grid-cols-2 lg:grid-cols-7">
            {challengeDays.map((day) => (
              <article className="bg-white p-6" key={day.day}>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#7d5131]">
                  Day {day.day}
                </p>
                <h3 className="mt-4 text-xl font-semibold text-stone-950">
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7d5131]">
              About
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
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

      <section
        className="border-t border-stone-200 bg-[#f8f5ef] px-6 py-24 sm:px-8 lg:px-10"
        id="signup"
      >
        <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7d5131]">
              Start here
            </p>
            <h2 className="mt-4 text-4xl font-semibold leading-tight text-stone-950 sm:text-5xl">
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
