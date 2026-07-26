import type { Metadata } from "next";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import MyBookingLookup from "@/components/booking/MyBookingLookup";

export const metadata: Metadata = {
  title: "Manage my booking",
  description: "Look up your jet ski booking, view the details, or cancel it.",
};

export default function MyBookingPage() {
  return (
    <>
      <PageHero
        compact
        eyebrow="Manage booking"
        title="Find my booking"
        subtitle="Enter your booking reference and the email you booked with to view or cancel your reservation."
      />
      <Container className="max-w-2xl py-12 sm:py-16">
        <MyBookingLookup />
      </Container>
    </>
  );
}
