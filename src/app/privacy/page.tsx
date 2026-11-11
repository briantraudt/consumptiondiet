import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Privacy | Consumption Diet" };

const h2 = "mt-8 text-xl font-semibold";
const p = "mt-3 leading-7 text-white/85";

export default function PrivacyPage() {
  return (
    <PageShell>
      <h1 className="text-4xl font-semibold">Privacy</h1>
      <p className={p}>Last updated November 11, 2026.</p>

      <h2 className={h2}>What we collect</h2>
      <p className={p}>
        Your first name, mobile number, time zone, the habit you chose, your start date and text times, your daily check-ins, and the text messages you send us. If you add a partner, we collect their first name and mobile number. Your answers to the safety questions at signup are used once and not stored.
      </p>

      <h2 className={h2}>How we use it</h2>
      <p className={p}>
        To run your challenge: sending your texts, recording check-ins, and replying when you text. We review messages and check-in rates to improve the prompts and to keep the service safe.
      </p>

      <h2 className={h2}>Who we share it with</h2>
      <p className={p}>
        Only the companies that run the service for us: Twilio (text messages), Stripe (payment), Supabase (database), Vercel (hosting), and Anthropic (the AI coach, which receives your first name, habit, progress, and recent messages in order to reply). Stripe is never told which habit you chose.
      </p>
      <p className={p}>
        We do not sell your information. We do not share mobile numbers or text message consent with third parties or affiliates for marketing.
      </p>

      <h2 className={h2}>Your partner</h2>
      <p className={p}>
        A partner who says yes sees your first name, whether you missed a day, and how many days you&apos;ve won. They only see which habit you chose if you check that box at signup.
      </p>

      <h2 className={h2}>Your result page</h2>
      <p className={p}>
        Your result page shows your first name and which days you won. It never shows your habit. Only people you send the link to can find it.
      </p>

      <h2 className={h2}>Deleting your data</h2>
      <p className={p}>
        Reply STOP to end texts at any time. To have your data deleted, email hello@consumptiondiet.com from any address and include your mobile number.
      </p>
    </PageShell>
  );
}
