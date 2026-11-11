import { describe, expect, it } from "vitest";
import { classifyCustomHabit, evaluateScreening, HABITS, SCREENING } from "@/lib/habits";
import { texts } from "@/lib/texts";

describe("habits", () => {
  it("has the 10 habits plus Other", () => {
    expect(HABITS.map((h) => h.name)).toEqual([
      "Social Media", "Alcohol", "Sugar", "Junk Food", "Shopping", "Porn",
      "Nicotine", "Gambling", "Streaming", "Weed", "Other",
    ]);
  });
});

describe("evaluateScreening", () => {
  const no = (slug: string) => Object.fromEntries((SCREENING[slug] ?? []).map((q) => [q.id, false]));

  it("lets people through when every answer is no", () => {
    for (const slug of ["alcohol", "gambling", "weed"]) {
      expect(evaluateScreening(slug, no(slug)).outcome).toBe("ok");
    }
  });

  it("refers heavy or dependent drinkers to a doctor", () => {
    for (const id of ["heavy_daily", "withdrawal", "doctor"]) {
      const result = evaluateScreening("alcohol", { ...no("alcohol"), [id]: true });
      expect(result.outcome).toBe("refer");
      if (result.outcome === "refer") expect(result.helpline).toContain("1-800-662-4357");
    }
  });

  it("sends gambling self-harm to 988", () => {
    const result = evaluateScreening("gambling", { essentials: false, self_harm: true });
    expect(result.outcome).toBe("refer");
    if (result.outcome === "refer") expect(result.helpline).toContain("988");
  });

  it("lets gambling money trouble through with the helpline attached", () => {
    const result = evaluateScreening("gambling", { essentials: true, self_harm: false });
    expect(result).toEqual({ outcome: "ok", note: expect.stringContaining("1-800-GAMBLER") });
  });

  it("refers medical weed use to a doctor", () => {
    expect(evaluateScreening("weed", { medical_use: true }).outcome).toBe("refer");
  });

  it("refuses to decide without every answer", () => {
    expect(() => evaluateScreening("alcohol", { heavy_daily: false })).toThrow();
  });

  it("asks nothing for habits with no questions", () => {
    expect(evaluateScreening("sugar", {}).outcome).toBe("ok");
  });
});

describe("classifyCustomHabit", () => {
  it("moves typed habits that match one of the 10", () => {
    expect(classifyCustomHabit("TikTok")).toEqual({ outcome: "map", slug: "social-media" });
    expect(classifyCustomHabit("vaping")).toEqual({ outcome: "map", slug: "nicotine" });
    expect(classifyCustomHabit("drinking soda")).toEqual({ outcome: "map", slug: "sugar" });
    expect(classifyCustomHabit("drinking")).toEqual({ outcome: "map", slug: "alcohol" });
    expect(classifyCustomHabit("fast food")).toEqual({ outcome: "map", slug: "junk-food" });
    expect(classifyCustomHabit("sports betting")).toEqual({ outcome: "map", slug: "gambling" });
  });

  it("keeps ordinary custom habits", () => {
    expect(classifyCustomHabit("  biting my   nails ")).toEqual({ outcome: "custom", label: "biting my nails" });
    expect(classifyCustomHabit("energy drinks")).toEqual({ outcome: "custom", label: "energy drinks" });
    expect(classifyCustomHabit("video games").outcome).toBe("custom");
  });

  it("refers drugs and medication to a doctor", () => {
    for (const text of ["oxycodone", "xanax", "my antidepressants", "pain pills", "meth"]) {
      expect(classifyCustomHabit(text).outcome).toBe("refer");
    }
  });

  it("refers food restriction and self-harm", () => {
    for (const text of ["eating", "binge eating", "cutting", "food"]) {
      expect(classifyCustomHabit(text).outcome).toBe("refer");
    }
  });
});

describe("texts", () => {
  it("puts the required opt-out wording in the first text", () => {
    const welcome = texts.welcome({ firstName: "Sam", phrase: "sugar", startDate: "2027-01-01", morning: 420, evening: 1200 });
    expect(welcome).toContain("Reply STOP");
    expect(welcome).toContain("HELP");
    expect(welcome).toContain("Msg & data rates may apply");
    expect(welcome).toContain("January 1");
  });

  it("asks the partner before sending them anything else", () => {
    const invite = texts.partnerInvite({ firstName: "Sam", label: "their 30-day challenge" });
    expect(invite).toContain("Reply YES");
    expect(invite).toContain("STOP");
    expect(invite).not.toContain("sugar");
  });

  it("keeps a slip from sounding like failure", () => {
    expect(texts.loss({ won: 1 })).toContain("1 win.");
    expect(texts.loss({ won: 4 })).toContain("4 wins");
  });
});
