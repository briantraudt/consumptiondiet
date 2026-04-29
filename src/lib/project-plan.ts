export type ProjectPlanDay = {
  day: number;
  title: string;
  goal: string;
  tasks: string[];
};

export const projectPlanDays: ProjectPlanDay[] = [
  {
    day: 1,
    title: "Foundation",
    goal: "Get the basic home base live.",
    tasks: [
      "Confirm domain routing for consumptiondiet.com",
      "Launch the basic landing page",
      "Add email capture form",
      "Create or prepare Substack publication named Consumption Diet",
      "Write rough About copy",
      "Verify the site works on desktop and mobile",
    ],
  },
  {
    day: 2,
    title: "Core Narrative",
    goal: "Define why this matters.",
    tasks: [
      "Draft the first essay: \"Why I'm Starting the Consumption Diet\"",
      "Include the personal story: heart attack, quitting alcohol, job loss, rebuilding, faith, and clarity",
      "Publish or prepare the essay",
      "Add a link to the essay from the homepage",
      "Write 3 short personal observations that can become social posts",
    ],
  },
  {
    day: 3,
    title: "Distribution Starts",
    goal: "Begin public publishing.",
    tasks: [
      "Create or update X/Twitter profile for Consumption Diet or Brian",
      "Create or update LinkedIn positioning",
      "Post 3 short thoughts about overconsumption and distraction",
      "Post one longer LinkedIn reflection",
      "Link back to the website or Substack",
    ],
  },
  {
    day: 4,
    title: "7-Day Challenge",
    goal: "Turn the idea into a simple productized challenge.",
    tasks: [
      "Finalize the 7-day challenge structure",
      "Write a short explanation for each day",
      "Create a simple downloadable or email-based version",
      "Update homepage CTA to point to the challenge signup",
      "Test the signup flow",
    ],
  },
  {
    day: 5,
    title: "Proof and Personal Documentation",
    goal: "Start doing the challenge publicly.",
    tasks: [
      "Begin Day 1 personally",
      "Write down what is difficult",
      "Write down what feels better",
      "Post a short public update",
      "Draft essay #2: \"What Happens When You Remove Noise\"",
    ],
  },
  {
    day: 6,
    title: "System and Cadence",
    goal: "Create the repeatable content engine.",
    tasks: [
      "Define weekly publishing cadence",
      "Create 10 future post ideas",
      "Create 5 future essay ideas",
      "Decide what happens after someone completes the 7-day challenge",
      "Add next-step copy to the website",
      "Review what worked and what felt forced",
    ],
  },
];

export function getProjectPlanDay(startDate: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw new Error("PROJECT_PLAN_START_DATE must use YYYY-MM-DD.");
  }

  const currentChicagoDate = getChicagoDateString(now);
  const elapsedDays = daysBetweenDateStrings(startDate, currentChicagoDate);
  const dayNumber = elapsedDays + 1;

  if (dayNumber < 1 || dayNumber > projectPlanDays.length) {
    return null;
  }

  return projectPlanDays[dayNumber - 1];
}

export function buildProjectPlanEmail(plan: ProjectPlanDay) {
  const escapedTitle = escapeHtml(plan.title);
  const escapedGoal = escapeHtml(plan.goal);
  const taskItems = plan.tasks
    .map((task) => `<li style="margin: 0 0 10px;">${escapeHtml(task)}</li>`)
    .join("");
  const textTasks = plan.tasks.map((task) => `- ${task}`).join("\n");

  return {
    subject: `Consumption Diet — Day ${plan.day} Project Plan`,
    html: `<!doctype html>
<html>
  <body style="margin:0;background:#f8f5ef;color:#1c1917;font-family:Arial,Helvetica,sans-serif;">
    <main style="max-width:640px;margin:0 auto;padding:40px 20px;">
      <section style="background:#ffffff;border:1px solid #e7e5e4;padding:32px;">
        <p style="margin:0 0 12px;color:#7d5131;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">Consumption Diet</p>
        <h1 style="margin:0 0 8px;font-size:32px;line-height:1.15;color:#0c0a09;">Day ${plan.day} - ${escapedTitle}</h1>
        <p style="margin:0 0 24px;font-size:18px;line-height:1.6;color:#57534e;"><strong>Goal:</strong> ${escapedGoal}</p>
        <h2 style="margin:0 0 14px;font-size:18px;color:#0c0a09;">Today's checklist</h2>
        <ul style="margin:0 0 28px;padding-left:22px;font-size:16px;line-height:1.6;color:#292524;">${taskItems}</ul>
        <p style="margin:0;font-size:16px;line-height:1.6;color:#1c1917;">Do the work. Keep it simple. Publish before it is perfect.</p>
      </section>
    </main>
  </body>
</html>`,
    text: `Consumption Diet - Day ${plan.day}: ${plan.title}

Goal: ${plan.goal}

Today's checklist:
${textTasks}

Do the work. Keep it simple. Publish before it is perfect.`,
  };
}

function getChicagoDateString(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Unable to calculate current America/Chicago date.");
  }

  return `${year}-${month}-${day}`;
}

function daysBetweenDateStrings(startDate: string, endDate: string) {
  const start = dateStringToUtcMidnight(startDate);
  const end = dateStringToUtcMidnight(endDate);
  return Math.floor((end.getTime() - start.getTime()) / 86_400_000);
}

function dateStringToUtcMidnight(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
