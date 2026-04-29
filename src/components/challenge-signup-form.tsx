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
    <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={handleSubmit}>
      <label className="sr-only" htmlFor="email">
        Email address
      </label>
      <input
        className="min-h-12 w-full rounded-sm border border-white/20 bg-white px-4 text-base font-medium text-[#061f34] outline-none transition placeholder:text-stone-400 focus:border-white focus:ring-2 focus:ring-[#4aa23a]"
        id="email"
        name="email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Email address"
        required
        type="email"
        value={email}
      />
      <button
        className="inline-flex min-h-12 items-center justify-center rounded-sm bg-[#2f7d24] px-6 text-base font-semibold text-white shadow-sm transition hover:bg-[#25651c] focus:outline-none focus:ring-2 focus:ring-[#4aa23a] focus:ring-offset-2 focus:ring-offset-[#061f34] disabled:cursor-not-allowed disabled:bg-stone-500"
        disabled={formState === "loading"}
        type="submit"
      >
        {formState === "loading" ? "Joining..." : "Start"}
      </button>

      <div aria-live="polite" className="min-h-6 sm:col-span-2">
        {message ? (
          <p
            className={
              formState === "error"
                ? "text-sm font-medium text-[#ffb4b4]"
                : "text-sm font-medium text-white"
            }
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
