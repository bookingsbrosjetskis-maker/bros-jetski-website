"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";

type Status = "idle" | "submitting" | "success" | "error";

export default function ReviewForm() {
  const [authorName, setAuthorName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [text, setText] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (authorName.trim().length < 2) return setError("Please enter your name.");
    if (rating < 1) return setError("Please choose a star rating.");
    if (text.trim().length < 10) return setError("Please write a few more words about your ride.");

    setStatus("submitting");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: authorName.trim(), rating, text: text.trim(), website }),
      });
      if (res.status === 201) {
        setStatus("success");
        return;
      }
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Something went wrong. Please try again.");
      setStatus("error");
    } catch {
      setError("We couldn't reach the server. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-8 text-center" role="status">
        <svg viewBox="0 0 24 24" className="mx-auto h-10 w-10 stroke-emerald-400" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a9 9 0 100 18 9 9 0 000-18zM8.5 12.5l2.5 2.5 4.5-5.5" />
        </svg>
        <h3 className="mt-3 text-lg font-semibold text-ink">Thanks for the review!</h3>
        <p className="mt-1 text-sm text-ink-muted">
          It&apos;ll appear on this page once our team approves it.
        </p>
      </div>
    );
  }

  const activeStars = hoverRating || rating;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div>
        <Label htmlFor="review-name">Your name</Label>
        <Input
          id="review-name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="e.g. Jordan K."
          maxLength={100}
        />
      </div>
      <div>
        <Label>Your rating</Label>
        <div className="flex gap-1" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              className="p-0.5 transition-transform hover:scale-110"
              aria-label={`${star} star${star > 1 ? "s" : ""}`}
            >
              <svg
                viewBox="0 0 20 20"
                className={`h-8 w-8 transition-colors ${star <= activeStars ? "fill-amber-400" : "fill-surface-bright"}`}
              >
                <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
              </svg>
            </button>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="review-text">Your review</Label>
        <Textarea
          id="review-text"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell us about your ride…"
          maxLength={1500}
        />
      </div>
      {/* Honeypot — hidden from users, catches bots */}
      <div className="hidden" aria-hidden>
        <label htmlFor="review-website">Website</label>
        <input
          id="review-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={status === "submitting"} className="w-full sm:w-auto">
        {status === "submitting" ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
