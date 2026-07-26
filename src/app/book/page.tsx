import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/PageHero";

export const dynamic = "force-dynamic";

/**
 * The Header "Book Now" link points here. There is a single active jet ski,
 * so this server component finds it and redirects to its booking page. If no
 * jet ski is available it renders a graceful message instead of a dead end.
 */
export default async function BookRedirectPage() {
  const ski = await prisma.jetSki.findFirst({
    where: { active: true },
    orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (ski) redirect(`/book/${ski.id}`);

  return (
    <>
      <PageHero
        eyebrow="Booking"
        title="No jet skis available"
        subtitle="Our jet ski is being prepped for the season. Please check back shortly or give us a call to book."
      />
      <Container className="py-12" />
    </>
  );
}
