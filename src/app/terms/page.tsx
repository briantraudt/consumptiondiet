import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Terms | Consumption Diet" };

const h2 = "mt-8 text-xl font-semibold";
const p = "mt-3 leading-7 text-white/85";

export default function TermsPage() {
  return (
    <PageShell>
      <h1 className="text-4xl font-semibold">Terms</h1>
      <p className={p}>Last updated November 11, 2026.</p>

      <h2 className={h2}>What this is</h2>
      <p className={p}>
        Consumption Diet is a 30-day challenge delivered by text message. You pick one habit to quit. We send a daily prompt, an evening check-in, and replies from an AI coach when you text us.
      </p>

      <h2 className={h2}>What this is not</h2>
      <p className={p}>
        This is not medical care, therapy, counseling, or addiction treatment. The coach is an AI, not a person, and can be wrong. Do not rely on it for medical decisions. If you may be physically dependent on alcohol or drugs, talk to a doctor before you stop. In an emergency call 911. If you are thinking about harming yourself, call or text 988.
      </p>

      <h2 className={h2}>Text messages</h2>
      <p className={p}>
        By signing up you agree to receive recurring automated text messages from Consumption Diet at the number you give us: about 2 a day for 30 days, plus replies when you text us. Message and data rates may apply. Message frequency varies. Reply STOP at any time to cancel. Reply HELP for help. Carriers are not liable for delayed or undelivered messages.
      </p>

      <h2 className={h2}>Accountability partners</h2>
      <p className={p}>
        If you add a partner, you confirm you have their permission to share their number with us. We send them one invitation. They only get updates if they reply YES, and they can reply STOP at any time.
      </p>

      <h2 className={h2}>Payment and refunds</h2>
      <p className={p}>
        The challenge is a single payment for 30 days. It is not a subscription and does not renew. If it isn&apos;t for you, email us within 7 days of your start date and we&apos;ll refund you.
      </p>

      <h2 className={h2}>Who can use it</h2>
      <p className={p}>You must be 18 or older and have a US mobile number.</p>

      <h2 className={h2}>Contact</h2>
      <p className={p}>hello@consumptiondiet.com</p>
    </PageShell>
  );
}
