import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Privacy | Consumption Diet" };

const h2 = "mt-8 text-xl font-semibold";
const p = "mt-3 leading-7 text-white/85";

export default function PrivacyPage() {
  return (
    <PageShell>
      <h1 className="text-4xl font-semibold">Privacy</h1>
      <p className={p}>Last updated November 17, 2026.</p>

      <h2 className={h2}>What we collect</h2>
      <p className={p}>
        Your mobile number, time zone, the habit you chose, your start date and text times, your daily check-ins, and the text messages you send us. If you add a partner we ask for your first name. We ask for your date of birth once to confirm your age; we keep only the result of that check, not the date. Your answers to the safety questions at signup are used once and not stored.
      </p>

      <h2 className={h2}>Information about your health</h2>
      <p className={p}>
        The habit you choose and what you tell the coach can say something about your health. We collect it only to run your challenge, and only after you reply YES to start. We do not sell it, use it for advertising, or share it except with the service providers listed below. You can withdraw your consent and erase it at any time by texting DELETE.
      </p>

      <h2 className={h2}>How we use it</h2>
      <p className={p}>
        To run your challenge: sending your texts, recording check-ins, and replying when you text. We review messages and check-in rates to improve the prompts and to keep the service safe.
      </p>

      <h2 className={h2}>Who we share it with</h2>
      <p className={p}>
        Only the companies that run the service for us: Twilio (text messages), Stripe (payment), Supabase (database), Vercel (hosting), and Anthropic (the AI coach, which receives your habit, progress, and recent messages in order to reply). Stripe is never told which habit you chose.
      </p>
      <p className={p}>
        We do not sell your information. We do not share mobile numbers or text message consent with third parties or affiliates for marketing.
      </p>

      <h2 className={h2}>What our texts say</h2>
      <p className={p}>
        Our texts never name your habit, so nothing sensitive shows on your lock screen.
      </p>

      <h2 className={h2}>Your partner</h2>
      <p className={p}>
        A partner who joins sees your first name, whether you missed a day, and how many days you&apos;ve won. They are never told which habit you chose.
      </p>

      <h2 className={h2}>Your result page</h2>
      <p className={p}>
        Your result page shows your first name if you gave one and which days you won. It never shows your habit. Only people you send the link to can find it.
      </p>

      <h2 className={h2}>How long we keep it</h2>
      <p className={p}>
        We erase the text of every message 90 days after it was sent. We keep your check-in record and account details until you delete them.
      </p>

      <h2 className={h2}>Deleting your data</h2>
      <p className={p}>
        Text DELETE to our number from your phone and confirm. That erases your account, your check-ins and your messages. Reply STOP to end texts without deleting anything.
      </p>

      <h2 className={h2}>Age</h2>
      <p className={p}>Consumption Diet is for adults 18 and over. We do not knowingly collect information from anyone under 18.</p>

      <h2 className={h2}>Contact</h2>
      <p className={p}>hello@consumptiondiet.com</p>
    </PageShell>
  );
}
