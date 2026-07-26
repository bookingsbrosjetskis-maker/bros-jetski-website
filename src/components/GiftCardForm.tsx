"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Status = "idle" | "submitting" | "success" | "error";

type Tier = {
  amount: string;
  name: string;
  blurb: string;
  popular?: boolean;
};

const TIERS: Tier[] = [
  {
    amount: "$120",
    name: "One Hour",
    blurb: "An hour on the Sea-Doo Spark Trixx. A perfect taste of the Ottawa River.",
  },
  {
    amount: "$480",
    name: "Half Day",
    blurb: "Four hours on the water. Our most-gifted value for special days.",
    popular: true,
  },
  {
    amount: "$960",
    name: "Full Day",
    blurb: "A full eight hours on the river. The ultimate day-on-the-water present.",
  },
];

export default function GiftCardForm() {
  const [amount, setAmount] = useState<string>("$480");
  const [customAmount, setCustomAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");

  const isCustom = amount === "custom";

  function selectTier(value: string) {
    setAmount(value);
    // Move focus context to the form for clarity on mobile.
    if (typeof document !== "undefined") {
      document.getElementById("gift-form")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  function resolvedAmount(): string {
    if (isCustom) {
      const trimmed = customAmount.trim().replace(/^\$/, "");
      return trimmed ? `$${trimmed}` : "Custom amount";
    }
    return amount;
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!email.trim()) next.email = "Please enter your email.";
    else if (!EMAIL_RE.test(email.trim()))
      next.email = "Please enter a valid email address.";
    if (isCustom && !customAmount.trim())
      next.customAmount = "Please enter an amount.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    setStatus("submitting");
    setServerError("");

    const recipientPart = recipient.trim()
      ? `, Recipient: ${recipient.trim()}`
      : "";
    const detailsPart = details.trim() ? `. ${details.trim()}` : "";
    const message = `[GIFT CARD INQUIRY] Amount: ${resolvedAmount()}${recipientPart}${detailsPart}`;

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

  return (
    <div className="space-y-12">
      {/* Tier cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((tier) => {
          const selected = amount === tier.amount;
          return (
            <button
              key={tier.amount}
              type="button"
              onClick={() => selectTier(tier.amount)}
              aria-pressed={selected}
              className={`glass group relative flex min-h-[44px] flex-col rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 ${
                selected
                  ? "border-cyan/70 glow-cyan ring-1 ring-cyan/40"
                  : "hover:border-cyan/40"
              }`}
            >
              {tier.popular && (
                <span className="font-label absolute right-4 top-4 rounded-full bg-cyan px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-surface-lowest">
                  Popular
                </span>
              )}
              <span className="gradient-text text-4xl font-bold tracking-tight">
                {tier.amount}
              </span>
              <span className="mt-3 font-display text-lg font-bold text-ink">
                {tier.name}
              </span>
              <span className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
                {tier.blurb}
              </span>
              <span
                className={`font-label mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] ${
                  selected ? "text-cyan" : "text-ink-muted group-hover:text-cyan"
                }`}
              >
                {selected ? "Selected" : "Select"}
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </button>
          );
        })}

        {/* Custom amount tier */}
        <button
          type="button"
          onClick={() => selectTier("custom")}
          aria-pressed={isCustom}
          className={`glass group relative flex min-h-[44px] flex-col rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 ${
            isCustom
              ? "border-cyan/70 glow-cyan ring-1 ring-cyan/40"
              : "hover:border-cyan/40"
          }`}
        >
          <span className="gradient-text text-4xl font-bold tracking-tight">
            $?
          </span>
          <span className="mt-3 font-display text-lg font-bold text-ink">
            Custom Amount
          </span>
          <span className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
            Tailor the adventure to any budget. Enter your amount in the form.
          </span>
          <span
            className={`font-label mt-5 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] ${
              isCustom ? "text-cyan" : "text-ink-muted group-hover:text-cyan"
            }`}
          >
            {isCustom ? "Selected" : "Select"}
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      </div>

      {/* Inquiry form */}
      <div id="gift-form" className="glass mx-auto max-w-2xl rounded-3xl p-6 sm:p-10">
        {status === "success" ? (
          <div className="text-center" role="status">
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
            <h3 className="mt-4 text-lg font-bold text-ink">Inquiry received</h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              Thanks. We&apos;ll reach out to arrange your{" "}
              <span className="text-cyan">{resolvedAmount()}</span> gift card
              within one business day.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-cyan">
                Selected gift
              </p>
              <p className="gradient-text mt-1 text-3xl font-bold tracking-tight">
                {resolvedAmount()}
              </p>
            </div>
            <form onSubmit={handleSubmit} noValidate className="grid gap-5 text-left">
              {isCustom && (
                <div>
                  <Label htmlFor="gift-amount">Gift amount ($)</Label>
                  <Input
                    id="gift-amount"
                    name="amount"
                    inputMode="numeric"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="e.g. 350"
                    className="min-h-[44px]"
                    aria-invalid={Boolean(errors.customAmount)}
                  />
                  {errors.customAmount && (
                    <p className="mt-1.5 text-xs text-red-400">
                      {errors.customAmount}
                    </p>
                  )}
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="gift-name">Your name</Label>
                  <Input
                    id="gift-name"
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
                  <Label htmlFor="gift-email">Your email</Label>
                  <Input
                    id="gift-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="min-h-[44px]"
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-400">{errors.email}</p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="gift-recipient">Recipient name (optional)</Label>
                <Input
                  id="gift-recipient"
                  name="recipient"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Who is this gift for?"
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <Label htmlFor="gift-details">Message (optional)</Label>
                <Textarea
                  id="gift-details"
                  name="details"
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Occasion, delivery date, a note for the card…"
                />
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
                className="min-h-[44px] w-full px-10 py-4 text-base"
              >
                {status === "submitting" ? "Sending…" : "Request This Gift Card"}
              </Button>
              <p className="text-center text-xs text-outline">
                Gift cards are arranged personally by our team. This form starts
                an inquiry, no online payment is taken here.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
