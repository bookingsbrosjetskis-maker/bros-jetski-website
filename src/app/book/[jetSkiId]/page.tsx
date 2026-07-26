import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { WAIVER_TEXT } from "@/lib/waiver-text";
import { formatCAD } from "@/lib/format";
import { SITE_NAME } from "@/lib/constants";
import { Badge, Container } from "@/components/ui";
import BookingWizard from "@/components/booking/BookingWizard";

export const metadata: Metadata = { title: `Book your ride | ${SITE_NAME}` };
export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ jetSkiId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { jetSkiId } = await params;
  const sp = await searchParams;
  const cancelled = sp.cancelled === "1";

  const jetSki = await prisma.jetSki.findFirst({
    where: { id: jetSkiId, active: true },
  });
  if (!jetSki) notFound();

  const rates = [
    { label: "Per hour", amount: jetSki.hourlyRate },
    { label: "Half day (4h)", amount: jetSki.halfDayRate },
    { label: "Full day (8h)", amount: jetSki.fullDayRate },
    { label: "Weekend (2 days)", amount: jetSki.weekendRate },
  ];

  return (
    <div className="pb-12 pt-24 sm:pb-16 sm:pt-28">
      <Container>
        <p className="font-label text-xs font-bold uppercase tracking-[0.1em] text-cyan">
          Book online
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
          {jetSki.name}
        </h1>
        <p className="mt-2 text-sm text-ink-muted sm:text-base">
          Pick a date and time, sign the waiver, and pay online. Your rental is
          paid in full when you book.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Wizard first on mobile, sidebar second */}
          <div className="order-2 lg:order-1">
            <BookingWizard
              jetSki={{
                id: jetSki.id,
                name: jetSki.name,
                hourlyRate: jetSki.hourlyRate,
                halfDayRate: jetSki.halfDayRate,
                fullDayRate: jetSki.fullDayRate,
                weekendRate: jetSki.weekendRate,
                depositAmount: jetSki.depositAmount,
              }}
              waiverText={WAIVER_TEXT}
              cancelled={cancelled}
            />
          </div>

          <aside className="order-1 lg:order-2">
            <div className="glass overflow-hidden rounded-2xl lg:sticky lg:top-24">
              <div className="relative">
                <Image
                  src={jetSki.imageUrl}
                  alt={jetSki.name}
                  width={640}
                  height={400}
                  className="h-44 w-full object-cover sm:h-52"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
                <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-cyan/15 px-2.5 py-1 font-label text-[10px] font-bold uppercase tracking-[0.1em] text-cyan ring-1 ring-inset ring-cyan/30 backdrop-blur">
                  Premium Selection
                </span>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <h2 className="text-lg font-bold text-ink">{jetSki.name}</h2>
                  <p className="mt-0.5 text-xs text-outline">{jetSki.model}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{jetSki.horsepower} HP</Badge>
                  <Badge color="slate">
                    {jetSki.seats} {jetSki.seats === 1 ? "seat" : "seats"}
                  </Badge>
                </div>
                <dl className="space-y-1.5 border-t border-outline-variant/50 pt-4 text-sm">
                  {rates.map((r) => (
                    <div key={r.label} className="flex justify-between">
                      <dt className="text-ink-muted">{r.label}</dt>
                      <dd className="font-semibold text-ink">
                        {formatCAD(r.amount)}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="text-xs leading-relaxed text-outline">
                  Pay the full rental online. Free range riding adds a $1,000
                  refundable security deposit collected in person. Life jackets
                  and safety kit are included.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
