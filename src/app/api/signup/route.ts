import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

type SignupRecord = {
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

  const { email } = payload as { email?: unknown };

  if (typeof email !== "string" || !emailPattern.test(email.trim())) {
    return NextResponse.json(
      { message: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const record: SignupRecord = {
    email: email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  const persisted = await persistSignup(record);
  console.info("Consumption Diet signup", record);

  return NextResponse.json({
    message: "You\u2019re in. Day 1 starts now.",
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
