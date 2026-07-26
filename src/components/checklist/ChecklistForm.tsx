"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { ChecklistSection, ChecklistDetailField } from "@/lib/checklist";
import { Button, Card, Input, Label } from "@/components/ui";

export default function ChecklistForm({
  token,
  sections,
  detailFields,
  initialName,
  alreadySubmitted,
}: {
  token: string;
  sections: ChecklistSection[];
  detailFields: ChecklistDetailField[];
  initialName: string;
  alreadySubmitted: boolean;
}) {
  const allIds = useMemo(
    () => sections.flatMap((s) => s.items.map((i) => i.id)),
    [sections]
  );

  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(allIds.map((id) => [id, alreadySubmitted]))
  );
  const [details, setDetails] = useState<Record<string, string>>({});
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const allChecked = allIds.every((id) => checked[id]);
  const detailsOk = detailFields.every((f) => !f.required || (details[f.id]?.trim() ?? "").length > 0);
  const canSubmit = allChecked && detailsOk && name.trim().length >= 2 && !busy;

  function toggle(id: string) {
    setChecked((c) => ({ ...c, [id]: !c[id] }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, items: checked, details, signedName: name.trim() }),
      });
      if (res.ok) {
        setDone(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "We couldn't submit your checklist. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  if (done) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 ring-1 ring-inset ring-emerald-400/30">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden>
            <path d="M5 12.5l4 4 10-10" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-ink">Checklist submitted</h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
          Thanks, {name.trim()}. Your rental agent will review it and co-sign it with you at the
          dock. Please still arrive 15 minutes early for your safety briefing.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {alreadySubmitted && (
        <p className="rounded-lg bg-cyan/10 px-4 py-3 text-sm text-cyan-soft ring-1 ring-inset ring-cyan/30">
          You have already submitted this checklist. You can review and resubmit it below if
          anything has changed.
        </p>
      )}

      {sections.map((section) => (
        <Card key={section.id} className="p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-ink">{section.heading}</h2>
          <ul className="mt-3 space-y-2.5">
            {section.items.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-surface-high">
                  <input
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={() => toggle(item.id)}
                    className="mt-0.5 h-5 w-5 shrink-0 rounded border-outline bg-surface-high text-cyan accent-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                  />
                  <span className="text-sm leading-relaxed text-ink-muted">{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-ink">Your details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {detailFields.map((f) => (
            <div key={f.id}>
              <Label htmlFor={`cl-${f.id}`}>
                {f.label}
                {f.required && <span className="text-cyan"> *</span>}
              </Label>
              <Input
                id={`cl-${f.id}`}
                required={f.required}
                value={details[f.id] ?? ""}
                onChange={(e) => setDetails((d) => ({ ...d, [f.id]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Label htmlFor="cl-name">
            Type your full name to sign<span className="text-cyan"> *</span>
          </Label>
          <Input
            id="cl-name"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full legal name"
          />
        </div>
      </Card>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-inset ring-red-400/30">
          {error}
        </p>
      )}
      {!allChecked && (
        <p className="text-sm text-outline">Please acknowledge every item to continue.</p>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto">
        {busy ? "Submitting…" : "Submit checklist"}
      </Button>
    </form>
  );
}
