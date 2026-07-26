"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "submitting" | "success" | "error";

const ATTENDANCE_OPTIONS = [
  "10 - 20 Guests",
  "20 - 50 Guests",
  "50+ Guests",
] as const;

export default function CorporateForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [attendance, setAttendance] = useState<string>(ATTENDANCE_OPTIONS[0]);
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!email.trim()) next.email = "Please enter your email.";
    else if (!EMAIL_RE.test(email.trim()))
      next.email = "Please enter a valid email address.";
    if (!company.trim()) next.company = "Please enter your company name.";
    if (!details.trim()) next.details = "Tell us a little about your event.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    setServerError("");

    const message = `[CORPORATE EVENT INQUIRY] Company: ${company.trim()}, Attendance: ${attendance}. ${details.trim()}`;

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message,
        }),
      });
      if (res.status === 201) {
        setStatus("success");
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setServerError(data?.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    } catch {
      setServerError(
        "We couldn't reach the server. Check your connection and try again.",
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="glass rounded-2xl p-8 text-center"
        role="status"
      >
        <svg
          viewBox="0 0 24 24"
          className="mx-auto h-11 w-11 stroke-cyan"
          fill="none"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM8.5 12.5l2.5 2.5 4.5-5.5" />
        </svg>
        <h3 className="mt-4 text-lg font-bold text-ink">Request received</h3>
        <p className="mt-1.5 text-sm text-ink-muted">
          Thanks. Our team will get back to you with availability and pricing
          within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-5 text-left">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="corp-name">Your name</Label>
          <Input
            id="corp-name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Rivera"
            className="min-h-[44px]"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && (
            <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>
          )}
        </div>
        <div>
          <Label htmlFor="corp-email">Work email</Label>
          <Input
            id="corp-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="min-h-[44px]"
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="corp-company">Company name</Label>
          <Input
            id="corp-company"
            name="company"
            autoComplete="organization"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp"
            className="min-h-[44px]"
            aria-invalid={Boolean(errors.company)}
          />
          {errors.company && (
            <p className="mt-1.5 text-xs text-red-400">{errors.company}</p>
          )}
        </div>
        <div>
          <Label htmlFor="corp-attendance">Expected attendance</Label>
          <Select
            id="corp-attendance"
            name="attendance"
            value={attendance}
            onChange={(e) => setAttendance(e.target.value)}
            className="min-h-[44px]"
          >
            {ATTENDANCE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="corp-details">Event details</Label>
        <Textarea
          id="corp-details"
          name="details"
          rows={4}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="Preferred dates, goals for the day, catering needs…"
          aria-invalid={Boolean(errors.details)}
        />
        {errors.details && (
          <p className="mt-1.5 text-xs text-red-400">{errors.details}</p>
        )}
      </div>

      {status === "error" && serverError && (
        <p
          className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          role="alert"
        >
          {serverError}
        </p>
      )}

      <Button
        type="submit"
        disabled={status === "submitting"}
        className="min-h-[44px] w-full px-10 py-4 text-base sm:w-auto"
      >
        {status === "submitting" ? "Sending…" : "Request Event Details"}
      </Button>
    </form>
  );
}
