import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatCAD } from "@/lib/format";
import { BOOKING_DEPOSIT_CENTS, CANCEL_CUTOFF_HOURS } from "@/lib/constants";
import { Container, Card } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import FleetCard from "@/components/FleetCard";
import { Reveal } from "@/components/motion/Reveal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Jet Ski & Rates",
  description:
    "Hourly, half-day, full-day, and weekend rentals of a 2023 Sea-Doo Spark Trixx. All prices in CAD, safety gear included.",
};

export default async function FleetPage() {
  const jetSkis = await prisma.jetSki.findMany({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
  });
  const ski = jetSkis[0];

  return (
    <>
      <PageHero
        eyebrow="Our Jet Ski"
        title="The Ride"
        subtitle="One machine, dialed in for fun. Our 2023 Sea-Doo Spark Trixx is light, playful, and beginner friendly, with every rental including life jackets, safety gear, a full tank of fuel, and an on-water orientation."
      />
      <Container className="py-12 sm:py-16">
        {!ski ? (
          <p className="rounded-2xl border border-outline-variant/60 bg-surface-low p-8 text-center text-ink-muted">
            Our jet ski is being prepped for the season. Check back shortly or give us a call.
          </p>
        ) : (
          <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12">
            <Reveal>
              <FleetCard jetSki={ski} priority />
            </Reveal>

            <Reveal delay={0.1} className="space-y-6">
              {/* Rates */}
              <Card className="p-6">
                <h2 className="font-display text-lg font-bold text-ink">Rates</h2>
                <p className="mt-1 text-sm text-ink-muted">Per jet ski, CAD.</p>
                <dl className="mt-4 divide-y divide-outline-variant/50">
                  {[
                    { label: "Per hour", amount: ski.hourlyRate },
                    { label: "Half day (4 hours)", amount: ski.halfDayRate },
                    { label: "Full day (8 hours)", amount: ski.fullDayRate },
                    { label: "Weekend (2 days)", amount: ski.weekendRate },
                  ].map((r) => (
                    <div key={r.label} className="flex items-baseline justify-between py-2.5">
                      <dt className="text-sm text-ink-muted">{r.label}</dt>
                      <dd className="gradient-text font-display text-base font-bold">{formatCAD(r.amount)}</dd>
                    </div>
                  ))}
                </dl>
              </Card>

              {/* Deposit & balance */}
              <Card className="p-6">
                <h2 className="font-display text-lg font-bold text-ink">
                  Pay {formatCAD(BOOKING_DEPOSIT_CENTS)} now, the rest when you arrive
                </h2>
                <ul className="mt-4 space-y-3 text-sm text-ink-muted">
                  <li>
                    <span className="font-semibold text-ink">
                      {formatCAD(BOOKING_DEPOSIT_CENTS)} deposit per jet ski
                    </span>{" "}
                    holds your slot. It comes off your rental total, so it is not an extra fee. Two
                    jet skis, {formatCAD(BOOKING_DEPOSIT_CENTS * 2)}.
                  </li>
                  <li>
                    <span className="font-semibold text-ink">The balance is paid at the dock</span>{" "}
                    before you ride, by card (tap, chip, or phone) or cash. A{" "}
                    {formatCAD(ski.hourlyRate)} hour is {formatCAD(BOOKING_DEPOSIT_CENTS)} online and{" "}
                    {formatCAD(ski.hourlyRate - BOOKING_DEPOSIT_CENTS)} on arrival.
                  </li>
                  <li>
                    <span className="font-semibold text-ink">
                      Cancel {CANCEL_CUTOFF_HOURS}+ hours ahead
                    </span>{" "}
                    and the deposit is refunded in full.{" "}
                    <span className="font-semibold text-amber-300">
                      No-shows and late cancellations forfeit the deposit.
                    </span>
                  </li>
                  <li>
                    <span className="font-semibold text-ink">If we cancel</span> for weather or
                    anything on our end, you keep your deposit or get a full refund. You never lose
                    it because of us.
                  </li>
                </ul>
              </Card>

              {/* Riding options */}
              <Card className="p-6">
                <h2 className="font-display text-lg font-bold text-ink">Riding options</h2>
                <ul className="mt-4 space-y-3 text-sm text-ink-muted">
                  <li>
                    <span className="font-semibold text-ink">Designated area</span> keeps you within
                    the marked riding zone. No security deposit required.
                  </li>
                  <li>
                    <span className="font-semibold text-ink">Free range</span> lets you explore the
                    river. A $1,000 refundable security deposit is collected in person before launch
                    and returned after your ride, less any damage per the waiver.
                  </li>
                </ul>
              </Card>

              {/* Policy */}
              <Card className="p-6">
                <h2 className="font-display text-lg font-bold text-ink">Good to know</h2>
                <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                  <li>All prices in CAD, per jet ski, and include fuel and safety gear.</li>
                  <li>
                    Riding with friends? Book up to {ski.unitCount} jet skis on one reservation for
                    the same time slot.
                  </li>
                  <li>
                    Free cancellation up to {CANCEL_CUTOFF_HOURS} hours before your start time; after
                    that the deposit is forfeited.
                  </li>
                  <li>Riders must be 18 or older with a valid PCOC (boating card).</li>
                </ul>
              </Card>
            </Reveal>
          </div>
        )}
      </Container>
    </>
  );
}
