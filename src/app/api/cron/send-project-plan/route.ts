import { NextResponse } from "next/server";
import { buildProjectPlanEmail, getProjectPlanDay } from "@/lib/project-plan";
import { getResend } from "@/lib/resend";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { message: "CRON_SECRET is not configured." },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const startDate = process.env.PROJECT_PLAN_START_DATE;
  const founderEmail = process.env.FOUNDER_EMAIL;
  const fromEmail = process.env.FROM_EMAIL;

  if (!startDate || !founderEmail || !fromEmail) {
    return NextResponse.json(
      {
        message:
          "PROJECT_PLAN_START_DATE, FOUNDER_EMAIL, and FROM_EMAIL are required.",
      },
      { status: 500 },
    );
  }

  const plan = getProjectPlanDay(startDate);

  if (!plan) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      message: "No project-plan email is scheduled for today.",
    });
  }

  const email = buildProjectPlanEmail(plan);
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: founderEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (error) {
    return NextResponse.json({ ok: false, error }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    day: plan.day,
    id: data?.id,
  });
}
