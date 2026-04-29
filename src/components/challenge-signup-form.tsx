"use client";

import { FormEvent, useState } from "react";

type FormState = "idle" | "loading" | "success" | "error";

export function ChallengeSignupForm() {
  const [firstName, setFirstName] = useState("");
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
        body: JSON.stringify({ firstName, email }),
      });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "Signup failed.");
      }

      setFormState("success");
      setMessage(result.message ?? "You are on the list.");
      setFirstName("");
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
    <form
      className="border border-[#dbe4ea] bg-white p-6 shadow-sm sm:p-8"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-5">
        <div>
          <label
            className="block text-sm font-semibold text-[#061f34]"
            htmlFor="firstName"
          >
            First name
          </label>
          <input
            className="mt-2 min-h-12 w-full rounded-sm border border-[#cfdbe3] bg-white px-4 text-base text-[#061f34] outline-none transition placeholder:text-stone-400 focus:border-[#061f34] focus:ring-2 focus:ring-[#061f34]/10"
            id="firstName"
            name="firstName"
            onChange={(event) => setFirstName(event.target.value)}
            placeholder="Brian"
            required
            type="text"
            value={firstName}
          />
        </div>
        <div>
          <label
            className="block text-sm font-semibold text-[#061f34]"
            htmlFor="email"
          >
            Email
          </label>
          <input
            className="mt-2 min-h-12 w-full rounded-sm border border-[#cfdbe3] bg-white px-4 text-base text-[#061f34] outline-none transition placeholder:text-stone-400 focus:border-[#061f34] focus:ring-2 focus:ring-[#061f34]/10"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </div>
      </div>

      <button
        className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-sm bg-[#061f34] px-6 text-base font-semibold text-white transition hover:bg-[#0a304e] focus:outline-none focus:ring-2 focus:ring-[#061f34] focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-stone-400"
        disabled={formState === "loading"}
        type="submit"
      >
        {formState === "loading" ? "Joining..." : "Join the 7-Day Challenge"}
      </button>

      <div aria-live="polite" className="mt-4 min-h-6">
        {message ? (
          <p
            className={
              formState === "error"
                ? "text-sm font-medium text-[#ef2d2d]"
                : "text-sm font-medium text-[#061f34]"
            }
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
