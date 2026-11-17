import { describe, expect, it } from "vitest";
import { classifyCustomHabit, evaluateScreening, HABITS, HELD_HABITS, SCREENING, TEXT_SCREENING } from "@/lib/habits";
import { namesSensitiveHabit } from "@/lib/parse";

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

describe("screening by text", () => {
  it("never names the habit in a question or referral", () => {
    for (const screens of Object.values(TEXT_SCREENING)) {
      for (const screen of screens) {
        expect(namesSensitiveHabit(screen.question)).toBe(false);
        expect(screen.question.length).toBeLessThanOrEqual(320);
        if (screen.referOnYes) {
          expect(namesSensitiveHabit(`${screen.referOnYes.message} ${screen.referOnYes.helpline}`)).toBe(false);
        }
        if (screen.noteOnYes) expect(namesSensitiveHabit(screen.noteOnYes)).toBe(false);
      }
    }
  });

  it("stops signup for likely dependence and for self-harm", () => {
    expect(TEXT_SCREENING.alcohol[0].referOnYes?.helpline).toContain("1-800-662-4357");
    expect(TEXT_SCREENING.gambling[0].referOnYes?.helpline).toContain("988");
    expect(TEXT_SCREENING.gambling[1].referOnYes).toBeNull();
  });

  it("holds weed back for now", () => {
    expect(HELD_HABITS.has("weed")).toBe(true);
  });
});
