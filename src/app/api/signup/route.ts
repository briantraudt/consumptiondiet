import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type SignupRecord = {
  firstName: string;
  email: string;
  createdAt: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Please submit a valid signup." },
      { status: 400 },
    );
  }

  const { firstName, email } = payload as {
    firstName?: unknown;
    email?: unknown;
  };

  if (typeof firstName !== "string" || firstName.trim().length < 1) {
    return NextResponse.json(
      { message: "First name is required." },
      { status: 400 },
    );
  }

  if (typeof email !== "string" || !emailPattern.test(email.trim())) {
    return NextResponse.json(
      { message: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const record: SignupRecord = {
    firstName: firstName.trim(),
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  const persisted = await persistSignup(record);
  console.info("Consumption Diet signup", record);

  return NextResponse.json({
    message: persisted
      ? "You are on the list. The challenge sequence is coming soon."
      : "You are on the list. Signup was logged for this MVP.",
    persisted,
  });
}

async function persistSignup(record: SignupRecord) {
  try {
    const dataDirectory = path.join(process.cwd(), "data");
    const filePath = path.join(dataDirectory, "signups.json");
    await mkdir(dataDirectory, { recursive: true });

    let existing: SignupRecord[] = [];
    try {
      const file = await readFile(filePath, "utf8");
      existing = JSON.parse(file) as SignupRecord[];
    } catch {
      existing = [];
    }

    const withoutDuplicate = existing.filter(
      (signup) => signup.email !== record.email,
    );
    await writeFile(
      filePath,
      `${JSON.stringify([...withoutDuplicate, record], null, 2)}\n`,
    );

    return true;
  } catch (error) {
    // Vercel serverless file writes are not durable; logging keeps the MVP honest.
    console.warn("Signup could not be written to local JSON.", error);
    return false;
  }
}
