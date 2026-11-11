import { NextResponse } from "next/server";
import { ADMIN_COOKIE, adminSessionValue, isAdminPassword } from "@/lib/admin";

export async function POST(request: Request) {
  const session = adminSessionValue();
  if (!session) {
    return NextResponse.json({ message: "Admin is not set up yet." }, { status: 503 });
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    if (typeof body.password === "string") password = body.password;
  } catch {
    // fall through to the failure below
  }

  if (!isAdminPassword(password)) {
    // Slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 800));
    return NextResponse.json({ message: "Wrong password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, session, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
