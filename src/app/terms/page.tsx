import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = { title: "Terms | Consumption Diet" };

const h2 = "mt-8 text-xl font-semibold";
const p = "mt-3 leading-7 text-white/85";

export default function TermsPage() {
  return (
    <PageShell>
      <h1 className="text-4xl font-semibold">Terms</h1>
      <p className={p}>Last updated November 17, 2026.</p>

      <h2 className={h2}>What this is</h2>
      <p className={p}>
        Consumption Diet is a 30-day challenge delivered by text message. You pick one habit to quit. We send a daily prompt, an evening check-in, and replies from an AI coach when you text us.
      </p>

      <h2 className={h2}>What this is not</h2>
      <p className={p}>
        This is not medical care or mental health care, and it does not diagnose or treat any condition. The coach is an AI, not a person, and it can be wrong. Do not rely on it for medical decisions. If your body may depend on a substance, talk to a doctor before you stop. In an emergency call 911. If you are thinking about harming yourself, call or text 988.
      </p>

      <h2 className={h2}>Text messages</h2>
      <p className={p}>
        You join by texting BEGIN to our number and replying YES when asked. By replying YES you agree to receive recurring automated text messages from Consumption Diet at that number: about 2 a day for 30 days, plus replies when you text us. Consent is not a condition of any purchase. Message frequency varies. Message and data rates may apply. Reply STOP at any time to cancel. Reply HELP for help, or email hello@consumptiondiet.com. Carriers are not liable for delayed or undelivered messages.
      </p>

      <h2 className={h2}>Accountability partners</h2>
      <p className={p}>
        If you want a partner, we give you an invitation to forward yourself. We never text someone because another person gave us their number. A partner joins by texting the code from their own phone, gets a short text when you miss a day plus a Sunday summary (about 8 messages a month), and can reply STOP at any time. Partners are never told which habit you chose.
      </p>

      <h2 className={h2}>Price and refunds</h2>
      <p className={p}>
        Your first 7 days are free, with no card needed. To continue, the full 30 days cost $31, paid once through a secure link we text you. It is not a subscription and does not renew. If you don&apos;t pay, your texts stop and nothing is charged. If you pay and it isn&apos;t for you, email us within 7 days of paying and we&apos;ll refund you.
      </p>

      <h2 className={h2}>Who can use it</h2>
      <p className={p}>
        You must be 18 or older and have a US mobile number. We ask for your date of birth to confirm your age. Some challenges are for people 21 and older.
      </p>

      <h2 className={h2}>Contact</h2>
      <p className={p}>hello@consumptiondiet.com</p>
    </PageShell>
  );
}
