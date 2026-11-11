// The habit list, the signup screening questions, and handling of typed "Other" habits.

export type Habit = {
  slug: string;
  name: string;
  /** How the habit reads inside a sentence: "30 days off ___". */
  phrase: string;
};

export const HABITS: Habit[] = [
  { slug: "social-media", name: "Social Media", phrase: "social media" },
  { slug: "alcohol", name: "Alcohol", phrase: "alcohol" },
  { slug: "sugar", name: "Sugar", phrase: "sugar" },
  { slug: "junk-food", name: "Junk Food", phrase: "junk food" },
  { slug: "shopping", name: "Shopping", phrase: "impulse shopping" },
  { slug: "porn", name: "Porn", phrase: "porn" },
  { slug: "nicotine", name: "Nicotine", phrase: "nicotine" },
  { slug: "gambling", name: "Gambling", phrase: "gambling" },
  { slug: "streaming", name: "Streaming", phrase: "binge streaming" },
  { slug: "weed", name: "Weed", phrase: "weed" },
  { slug: "other", name: "Other", phrase: "this habit" },
];

export function getHabit(slug: string): Habit | undefined {
  return HABITS.find((h) => h.slug === slug);
}

export const HELPLINES = {
  crisis: "Call or text 988 (Suicide & Crisis Lifeline), free, 24/7. In an emergency call 911.",
  substance: "SAMHSA National Helpline: 1-800-662-4357, free, 24/7.",
  gambling: "National Problem Gambling Helpline: 1-800-426-2537 (1-800-GAMBLER), free, 24/7.",
  nicotine: "1-800-QUIT-NOW (1-800-784-8669) is a free quit line and can help with nicotine replacement.",
} as const;

export type ScreeningQuestion = {
  id: string;
  text: string;
};

export const SCREENING: Record<string, ScreeningQuestion[]> = {
  alcohol: [
    { id: "heavy_daily", text: "Do you have 4 or more drinks on most days?" },
    {
      id: "withdrawal",
      text: "When you've stopped or cut back before, did you get shakes, sweats, a racing heart, or a seizure?",
    },
    { id: "doctor", text: "Has a doctor told you not to stop drinking on your own?" },
  ],
  gambling: [
    { id: "essentials", text: "Is gambling putting your rent, bills, or food at risk?" },
    { id: "self_harm", text: "Have you had thoughts of hurting yourself because of gambling?" },
  ],
  weed: [
    { id: "medical_use", text: "Do you use it on a doctor's advice for a medical condition?" },
  ],
};

export type ScreeningResult =
  | { outcome: "ok"; note?: string }
  | { outcome: "refer"; title: string; message: string; helpline: string };

/** Decide whether someone can start, based on their screening answers. */
export function evaluateScreening(
  slug: string,
  answers: Record<string, boolean>,
): ScreeningResult {
  const questions = SCREENING[slug] ?? [];
  const missing = questions.some((q) => typeof answers[q.id] !== "boolean");
  if (missing) {
    throw new Error("Please answer every question.");
  }

  if (slug === "alcohol" && (answers.heavy_daily || answers.withdrawal || answers.doctor)) {
    return {
      outcome: "refer",
      title: "Talk to a doctor first.",
      message:
        "Stopping alcohol suddenly can be dangerous if your body depends on it. A doctor can help you stop safely. This challenge will be here when you're ready.",
      helpline: HELPLINES.substance,
    };
  }

  if (slug === "gambling" && answers.self_harm) {
    return {
      outcome: "refer",
      title: "Please talk to someone today.",
      message:
        "What you're carrying is more than a text challenge should handle. You deserve real support right now.",
      helpline: `${HELPLINES.crisis} ${HELPLINES.gambling}`,
    };
  }

  if (slug === "weed" && answers.medical_use) {
    return {
      outcome: "refer",
      title: "Check with your doctor first.",
      message:
        "If you use it for a medical condition, talk to your doctor before you stop. Come back once you have a plan together.",
      helpline: HELPLINES.substance,
    };
  }

  if (slug === "gambling" && answers.essentials) {
    return { outcome: "ok", note: HELPLINES.gambling };
  }
  if (slug === "nicotine") {
    return { outcome: "ok", note: HELPLINES.nicotine };
  }
  return { outcome: "ok" };
}

export type CustomHabitResult =
  | { outcome: "custom"; label: string }
  | { outcome: "map"; slug: string }
  | { outcome: "refer"; title: string; message: string; helpline: string };

const MAP_RULES: Array<[RegExp, string]> = [
  [/\b(tiktok|tik tok|instagram|insta|facebook|twitter|x\.com|snapchat|reddit|scrolling|doomscroll\w*|social media|youtube shorts|reels)\b/, "social-media"],
  [/\b(sugar|candy|sweets|dessert|desserts|soda|pop|chocolate)\b/, "sugar"],
  [/\b(alcohol|beer|wine|liquor|whiskey|vodka|booze)\b|^(drinking|drinks)$/, "alcohol"],
  [/\b(junk food|fast food|chips|takeout|take out|mcdonald'?s|drive thru|drive through)\b/, "junk-food"],
  [/\b(shopping|amazon|online shopping|impulse buying|overspending)\b/, "shopping"],
  [/\b(porn|pornography)\b/, "porn"],
  [/\b(vape|vaping|vapes|nicotine|cigarettes?|smoking cigarettes|zyn|dip|chewing tobacco|tobacco|juul)\b/, "nicotine"],
  [/\b(gambling|betting|sports betting|sportsbook|draftkings|fanduel|casino|slots|poker|lottery|scratch offs?)\b/, "gambling"],
  [/\b(netflix|streaming|binge watching|binge-watching|tv|television|hulu)\b/, "streaming"],
  [/\b(weed|marijuana|cannabis|pot|edibles|thc)\b/, "weed"],
];

// Things a text challenge must not coach. These get a referral and no charge.
const DRUG_PATTERN =
  /\b(heroin|fentanyl|opioids?|opiates?|oxy\w*|percocet|vicodin|hydrocodone|morphine|methadone|suboxone|meth|methamphetamine|cocaine|crack|xanax|benzos?|benzodiazepines?|klonopin|valium|ativan|adderall|pills|painkillers?|ketamine|kratom|medication|medications|meds|antidepressants?|prescription)\b/;
const FOOD_RESTRICTION_PATTERN =
  /\b(eating|food|meals?|calories|carbs|purg\w*|binge eating|bingeing|binging|overeating|starv\w*|fasting|weight|throwing up|laxatives?)\b/;
const SELF_HARM_PATTERN = /\b(cutting|self[- ]harm|hurting myself|suicid\w*|kill myself)\b/;

/** Fixed rules for a typed habit. Runs before, and regardless of, any AI check. */
export function classifyCustomHabit(input: string): CustomHabitResult {
  const label = input.trim().replace(/\s+/g, " ").slice(0, 60);
  const text = label.toLowerCase();

  if (SELF_HARM_PATTERN.test(text)) {
    return {
      outcome: "refer",
      title: "Please talk to someone today.",
      message: "This needs more support than a text challenge can give. You deserve real help.",
      helpline: HELPLINES.crisis,
    };
  }
  if (DRUG_PATTERN.test(text)) {
    return {
      outcome: "refer",
      title: "Talk to a doctor first.",
      message:
        "Stopping some drugs and medications suddenly can be dangerous. A doctor can help you stop safely.",
      helpline: HELPLINES.substance,
    };
  }
  for (const [pattern, slug] of MAP_RULES) {
    if (pattern.test(text)) return { outcome: "map", slug };
  }
  if (FOOD_RESTRICTION_PATTERN.test(text)) {
    return {
      outcome: "refer",
      title: "This one needs a different kind of help.",
      message:
        "Changes to how you eat are best made with a doctor or dietitian, not a text challenge.",
      helpline:
        "National Alliance for Eating Disorders helpline: 1-866-662-1235, weekdays, free.",
    };
  }
  return { outcome: "custom", label };
}
