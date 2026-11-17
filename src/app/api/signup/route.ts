import { NextResponse } from "next/server";
import { webSignup, type WebSignupInput } from "@/lib/web-signup";

export const maxDuration = 30;

export async function POST(request: Request) {
  let input: WebSignupInput;
  try {
    input = (await request.json()) as WebSignupInput;
  } catch {
    return NextResponse.json({ status: "invalid", message: "Please submit the form again." }, { status: 400 });
  }

  if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)) {
    return NextResponse.json(
      { status: "invalid", message: "Signups aren't open yet. Please check back in a few days." },
      { status: 503 },
    );
  }

  try {
    const result = await webSignup(input);
    return NextResponse.json(result, { status: result.status === "invalid" ? 400 : 200 });
  } catch (err) {
    console.error("signup failed", err instanceof Error ? err.message : err);
    return NextResponse.json(
      { status: "invalid", message: "Something went wrong on our side. Please try again in a minute." },
      { status: 500 },
    );
  }
}
