import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CHECKLIST_SECTIONS, CHECKLIST_DETAIL_FIELDS } from "@/lib/checklist";
import { SITE_NAME } from "@/lib/constants";
import { formatBookingRange, formatDate, toDateKey } from "@/lib/format";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import ChecklistForm from "@/components/checklist/ChecklistForm";

export const metadata: Metadata = {
  title: `Safety checklist | ${SITE_NAME}`,
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const checklist = await prisma.safetyChecklist.findUnique({
    where: { token },
    include: { booking: { include: { jetSki: true } } },
  });
  if (!checklist) notFound();

  const { booking } = checklist;

  return (
    <>
      <PageHero
        eyebrow="Rental Boat Safety Checklist"
        title="Complete your pre-ride checklist"
        subtitle="Transport Canada requires this acknowledgement before you operate a personal watercraft. It takes a couple of minutes — your rental agent will co-sign it with you at the dock."
      />
      <Container className="max-w-3xl py-10 sm:py-14">
        <div className="mb-6 rounded-xl border border-outline-variant/60 bg-surface-high p-4 text-sm text-ink-muted">
          <span className="font-semibold text-ink">{booking.jetSki.name}</span> ·{" "}
          {formatDate(toDateKey(booking.startTime))} ·{" "}
          {formatBookingRange(booking.startTime, booking.endTime)}
        </div>
        <ChecklistForm
          token={token}
          sections={CHECKLIST_SECTIONS}
          detailFields={CHECKLIST_DETAIL_FIELDS}
          initialName={booking.customerName}
          alreadySubmitted={!!checklist.submittedAt}
        />
      </Container>
    </>
  );
}
