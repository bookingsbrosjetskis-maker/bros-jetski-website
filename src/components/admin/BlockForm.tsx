"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Select } from "@/components/ui";
import { BlockReason } from "@/lib/constants";
import { toDateKey } from "@/lib/format";

const REASON_LABELS: Record<BlockReason, string> = {
  [BlockReason.MAINTENANCE]: "Maintenance",
  [BlockReason.WEATHER]: "Weather",
  [BlockReason.OTHER]: "Other",
};

export default function BlockForm({
  skis,
}: {
  skis: { id: string; name: string }[];
}) {
  const router = useRouter();
  const todayKey = toDateKey(new Date());
  const [jetSkiId, setJetSkiId] = useState("");
  const [date, setDate] = useState(todayKey);
  const [reason, setReason] = useState<string>(BlockReason.MAINTENANCE);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jetSkiId: jetSkiId || null,
          date,
          reason,
          note: note.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        warning?: string;
      };
      if (res.ok) {
        if (data.warning) setWarning(data.warning);
        setNote("");
        router.refresh();
      } else {
        setError(data.error ?? "Something went wrong.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="block-ski">Unit</Label>
          <Select
            id="block-ski"
            value={jetSkiId}
            onChange={(e) => setJetSkiId(e.target.value)}
          >
            <option value="">All units (whole fleet)</option>
            {skis.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="block-date">Date</Label>
          <Input
            id="block-date"
            type="date"
            required
            min={todayKey}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="block-reason">Reason</Label>
          <Select
            id="block-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {Object.values(BlockReason).map((r) => (
              <option key={r} value={r}>
                {REASON_LABELS[r]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="block-note">Note (optional)</Label>
          <Input
            id="block-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. impeller service"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/30">{error}</p>
      )}
      {warning && (
        <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-300 ring-1 ring-inset ring-amber-400/30">
          {warning}
        </p>
      )}

      <Button type="submit" disabled={busy}>
        {busy ? "Adding…" : "Add block"}
      </Button>
    </form>
  );
}
