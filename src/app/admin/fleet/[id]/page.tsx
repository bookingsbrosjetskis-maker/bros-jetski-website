import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import FleetForm from "@/components/admin/FleetForm";

export const dynamic = "force-dynamic";

/** Cents -> dollar string for form inputs, e.g. 12550 -> "125.5". */
function toDollars(cents: number): string {
  return (cents / 100).toString();
}

export default async function EditJetSkiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ski = await prisma.jetSki.findUnique({ where: { id } });
  if (!ski) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
          Edit {ski.name}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Prices are entered in dollars and stored as cents.
        </p>
      </div>
      <FleetForm
        id={ski.id}
        initial={{
          name: ski.name,
          model: ski.model,
          horsepower: String(ski.horsepower),
          seats: String(ski.seats),
          description: ski.description,
          imageUrl: ski.imageUrl,
          hourlyRate: toDollars(ski.hourlyRate),
          halfDayRate: toDollars(ski.halfDayRate),
          fullDayRate: toDollars(ski.fullDayRate),
          weekendRate: toDollars(ski.weekendRate),
          depositAmount: toDollars(ski.depositAmount),
          featured: ski.featured,
          active: ski.active,
        }}
      />
    </div>
  );
}
