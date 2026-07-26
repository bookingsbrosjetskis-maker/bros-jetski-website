import FleetForm from "@/components/admin/FleetForm";

export default function NewJetSkiPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          Add jet ski
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Prices are entered in dollars and stored as cents.
        </p>
      </div>
      <FleetForm />
    </div>
  );
}
