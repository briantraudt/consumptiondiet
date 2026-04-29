"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

export function ChallengeSignupForm() {
  const [email, setEmail] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("loading");
    setMessage("");

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "Signup failed.");
      }

      setFormState("success");
      setMessage(result.message ?? "You\u2019re in. Day 1 starts now.");
      setEmail("");
    } catch (error) {
      setFormState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="email">
        Email address
      </label>
      <input
        className="min-h-14 w-full rounded-sm bg-white px-5 text-lg font-medium text-[#0B2A44] outline-none transition placeholder:text-stone-400 focus:ring-2 focus:ring-[#2E7D32]"
        id="email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email address"
        required
        type="email"
        value={email}
      />

      <button
        className="inline-flex min-h-14 w-full items-center justify-center rounded-sm bg-[#2E7D32] px-6 text-lg font-bold text-white transition hover:bg-[#276b2b] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#2E7D32] focus:ring-offset-4 focus:ring-offset-black/30 disabled:cursor-not-allowed disabled:bg-stone-500"
        disabled={formState === "loading"}
        type="submit"
      >
        {formState === "loading"
          ? "Starting..."
          : "Start the 7-Day Consumption Diet"}
      </button>

      <div aria-live="polite" className="min-h-6">
        {message ? (
          <p
            className={
              formState === "error"
                ? "text-sm font-semibold text-[#ffb4b4]"
                : "text-sm font-semibold text-white"
            }
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
