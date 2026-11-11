import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "cd_admin";

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** The cookie value is derived from the password, so changing the password signs everyone out. */
export function adminSessionValue(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) return null;
  return createHmac("sha256", password).update("consumption-diet-admin-v1").digest("hex");
}

export function isAdminPassword(given: string): boolean {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) return false;
  return safeEqual(given, password);
}

export async function isAdmin(): Promise<boolean> {
  const expected = adminSessionValue();
  if (!expected) return false;
  const given = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  return safeEqual(given, expected);
}

/** Accepts a YouTube link or a bare id. Returns the 11-character video id. */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  try {
    const url = new URL(text);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else {
        const match = url.pathname.match(/^\/(shorts|embed|live)\/([^/?]+)/);
        id = match ? match[2] : null;
      }
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
