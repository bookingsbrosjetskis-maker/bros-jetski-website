"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

export type FleetFormInitial = {
  name: string;
  model: string;
  horsepower: string;
  seats: string;
  description: string;
  imageUrl: string;
  /** Dollar strings, e.g. "125" or "89.50" (stored as cents in the DB). */
  hourlyRate: string;
  halfDayRate: string;
  fullDayRate: string;
  weekendRate: string;
  depositAmount: string;
  /** Most jet skis a customer may request for one slot (a supply ceiling the
   * owner sets, not a count of machines owned). */
  unitCount: string;
  featured: boolean;
  active: boolean;
};

const EMPTY: FleetFormInitial = {
  name: "",
  model: "",
  horsepower: "",
  seats: "",
  description: "",
  imageUrl: "/photos/ride-action.jpg",
  hourlyRate: "",
  halfDayRate: "",
  fullDayRate: "",
  weekendRate: "",
  depositAmount: "",
  unitCount: "1",
  featured: false,
  active: true,
};

/** "125.50" (dollars) -> 12550 (cents), or null if not a positive amount. */
function toCents(v: string): number | null {
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100);
}

function toPosInt(v: string): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export default function FleetForm({
  id,
  initial,
}: {
  /** Present when editing an existing jet ski. */
  id?: string;
  initial?: FleetFormInitial;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FleetFormInitial>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof FleetFormInitial>(key: K, value: FleetFormInitial[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const name = form.name.trim();
    const model = form.model.trim();
    const description = form.description.trim();
    const imageUrl = form.imageUrl.trim();
    if (!name || !model || !description || !imageUrl) {
      setError("Name, model, description and image URL are required.");
      return;
    }
    const horsepower = toPosInt(form.horsepower);
    const seats = toPosInt(form.seats);
    const unitCount = toPosInt(form.unitCount);
    if (horsepower === null || seats === null || unitCount === null) {
      setError("Horsepower, seats and max jet skis per booking must be positive whole numbers.");
      return;
    }
    const hourlyRate = toCents(form.hourlyRate);
    const halfDayRate = toCents(form.halfDayRate);
    const fullDayRate = toCents(form.fullDayRate);
    const weekendRate = toCents(form.weekendRate);
    const depositAmount = toCents(form.depositAmount);
    if (
      hourlyRate === null ||
      halfDayRate === null ||
      fullDayRate === null ||
      weekendRate === null ||
      depositAmount === null
    ) {
      setError("All rates and the deposit must be positive dollar amounts.");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(id ? `/api/admin/fleet/${id}` : "/api/admin/fleet", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          model,
          description,
          imageUrl,
          horsepower,
          seats,
          unitCount,
          hourlyRate,
          halfDayRate,
          fullDayRate,
          weekendRate,
          depositAmount,
          featured: form.featured,
          active: form.active,
        }),
      });
      if (res.ok) {
        router.push("/admin/fleet");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Something went wrong.");
    } catch {
      setError("Network error. Please try again.");
    }
    setBusy(false);
  }

  const money = (label: string, key: keyof FleetFormInitial) => (
    <div>
      <Label htmlFor={key}>{label} (CAD $)</Label>
      <Input
        id={key}
        type="number"
        min="0.01"
        step="0.01"
        inputMode="decimal"
        required
        value={form[key] as string}
        onChange={(e) => set(key, e.target.value)}
        placeholder="0.00"
      />
    </div>
  );

  return (
    <Card className="max-w-2xl p-6">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Wave Runner"
            />
          </div>
          <div>
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              required
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
              placeholder="Sea-Doo Spark Trixx"
            />
          </div>
          <div>
            <Label htmlFor="horsepower">Horsepower</Label>
            <Input
              id="horsepower"
              type="number"
              min="1"
              step="1"
              required
              value={form.horsepower}
              onChange={(e) => set("horsepower", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="seats">Seats</Label>
            <Input
              id="seats"
              type="number"
              min="1"
              step="1"
              required
              value={form.seats}
              onChange={(e) => set("seats", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="unitCount">Max jet skis per booking</Label>
            <Input
              id="unitCount"
              type="number"
              min="1"
              step="1"
              required
              value={form.unitCount}
              onChange={(e) => set("unitCount", e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-muted">
              The highest number a customer can request for one time slot. Set it to the most you
              can realistically supply, not the number you own. A slot stays bookable until this
              many jet skis are committed across it.
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            required
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            required
            value={form.imageUrl}
            onChange={(e) => set("imageUrl", e.target.value)}
            placeholder="/photos/ride-action.jpg"
          />
          <p className="mt-1 text-xs text-ink-muted">
            Path or URL, e.g. /photos/ride-action.jpg
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {money("Hourly rate", "hourlyRate")}
          {money("Half day rate (4 hours)", "halfDayRate")}
          {money("Full day rate (8 hours)", "fullDayRate")}
          {money("Weekend rate (2 days)", "weekendRate")}
          <div className="sm:col-span-2">
            {money("Free range security deposit", "depositAmount")}
            <p className="mt-1 text-xs text-ink-muted">
              Refundable deposit collected in person for free range rides. It is never charged online.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm font-medium text-ink-muted">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => set("featured", e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant accent-cyan"
            />
            Featured on homepage
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-ink-muted">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => set("active", e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant accent-cyan"
            />
            Active (bookable)
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/30">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : id ? "Save changes" : "Create jet ski"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/fleet")}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
