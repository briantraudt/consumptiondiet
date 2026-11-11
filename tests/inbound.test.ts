import { describe, expect, it } from "vitest";
import { classifyInbound, detectSafetyFlag, normalizeUsPhone, toSmsText } from "@/lib/inbound";
import { isValidTwilioSignature, twilioSignature } from "@/lib/twilio";
import { parseYouTubeId } from "@/lib/admin";

describe("classifyInbound", () => {
  it("reads check-in replies", () => {
    for (const text of ["Y", "y", "Yes", "yes!", " YEP ", "won"]) expect(classifyInbound(text)).toBe("yes");
    for (const text of ["N", "no", "No.", "nope", "slipped"]) expect(classifyInbound(text)).toBe("no");
  });

  it("recognizes carrier keywords", () => {
    expect(classifyInbound("STOP")).toBe("stop");
    expect(classifyInbound("Unsubscribe")).toBe("stop");
    expect(classifyInbound("quit")).toBe("stop");
    expect(classifyInbound("START")).toBe("start");
    expect(classifyInbound("help")).toBe("help");
  });

  it("sends everything else to the coach", () => {
    expect(classifyInbound("I really want a drink right now")).toBe("other");
    expect(classifyInbound("no way I can do this")).toBe("other");
    expect(classifyInbound("I want to quit")).toBe("other");
    expect(classifyInbound("help me I'm about to slip")).toBe("other");
  });
});

describe("detectSafetyFlag", () => {
  it("catches crisis language", () => {
    for (const text of [
      "I want to kill myself",
      "honestly feeling suicidal",
      "I don't want to be here anymore",
      "everyone would be better off dead",
      "thinking about hurting myself",
    ]) {
      expect(detectSafetyFlag(text)).toBe("crisis");
    }
  });

  it("catches medical red flags", () => {
    expect(detectSafetyFlag("I think I had a seizure last night")).toBe("medical");
    expect(detectSafetyFlag("having chest pain since I stopped")).toBe("medical");
  });

  it("leaves ordinary hard days alone", () => {
    expect(detectSafetyFlag("this craving is killing me")).toBeNull();
    expect(detectSafetyFlag("I slipped and feel terrible")).toBeNull();
    expect(detectSafetyFlag("dying for a cigarette")).toBeNull();
  });
});

describe("normalizeUsPhone", () => {
  it("accepts common US formats", () => {
    expect(normalizeUsPhone("(512) 555-0123")).toBe("+15125550123");
    expect(normalizeUsPhone("1-512-555-0123")).toBe("+15125550123");
    expect(normalizeUsPhone("+1 512 555 0123")).toBe("+15125550123");
  });

  it("rejects bad numbers", () => {
    expect(normalizeUsPhone("555-0123")).toBeNull();
    expect(normalizeUsPhone("012-555-0123")).toBeNull();
    expect(normalizeUsPhone("+44 20 7946 0958")).toBeNull();
  });
});

describe("toSmsText", () => {
  it("swaps characters that make texts longer and more expensive", () => {
    expect(toSmsText("You’re in — day 1 \u{1F4AA}")).toBe("You're in - day 1");
  });
});

describe("twilio signature", () => {
  const url = "https://www.consumptiondiet.com/api/twilio/inbound";
  const params = { From: "+15125550123", Body: "Y", MessageSid: "SM123" };

  it("accepts a correct signature and rejects everything else", () => {
    const good = twilioSignature("token", url, params);
    expect(isValidTwilioSignature("token", good, url, params)).toBe(true);
    expect(isValidTwilioSignature("token", good, url, { ...params, Body: "N" })).toBe(false);
    expect(isValidTwilioSignature("other-token", good, url, params)).toBe(false);
    expect(isValidTwilioSignature("token", null, url, params)).toBe(false);
  });

  it("matches Twilio's documented example", () => {
    // From Twilio's webhook security docs.
    const signature = twilioSignature(
      "12345",
      "https://mycompany.com/myapp.php?foo=1&bar=2",
      { CallSid: "CA1234567890ABCDE", Caller: "+12349013030", Digits: "1234", From: "+12349013030", To: "+18005551212" },
    );
    expect(signature).toBe("0/KCTR6DLpKmkAf8muzZqo1nDgQ=");
  });
});

describe("parseYouTubeId", () => {
  it("reads the id out of common link shapes", () => {
    expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(parseYouTubeId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("rejects other links", () => {
    expect(parseYouTubeId("https://vimeo.com/12345")).toBeNull();
    expect(parseYouTubeId("https://evil.example/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});
