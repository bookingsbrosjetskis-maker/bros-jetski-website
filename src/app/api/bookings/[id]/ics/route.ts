import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatBookingRange, formatCAD } from "@/lib/format";
import {
  BookingStatus,
  RidingOption,
  SITE_ADDRESS,
  SITE_NAME,
  SITE_PHONE,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Escape text values per RFC 5545 (backslash, semicolon, comma, newline). */
function icsEscape(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold content lines longer than 75 octets (continuation = CRLF + space). */
function icsFold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  for (let i = 75; i < line.length; i += 74) {
    parts.push(" " + line.slice(i, i + 74));
  }
  return parts.join("\r\n");
}

/** Stored slot times are UTC-encoded *local dock time*, so we export them as
 * floating local times (basic format, no trailing "Z") — calendars then show
 * the ride at dock wall-clock time regardless of the viewer's timezone. */
function icsFloating(d: Date): string {
  return d.toISOString().slice(0, 19).replace(/[-:]/g, "");
}

/** Real-UTC timestamp (with "Z") for DTSTAMP. */
function icsUtcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const email = (new URL(req.url).searchParams.get("email") ?? "").trim().toLowerCase();

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { jetSki: true },
  });

  // One shared 404 — never reveal whether the reference exists.
  if (!booking || !email || booking.email.toLowerCase() !== email) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (
    booking.status !== BookingStatus.CONFIRMED &&
    booking.status !== BookingStatus.COMPLETED
  ) {
    return NextResponse.json(
      { error: "Only confirmed bookings can be added to a calendar." },
      { status: 409 }
    );
  }

  const description = [
    `Booking reference: ${booking.id}`,
    `When: ${formatBookingRange(booking.startTime, booking.endTime)}`,
    `Paid in full: ${formatCAD(booking.totalPrice)}`,
    ...(booking.ridingOption === RidingOption.FREE_RANGE
      ? ["Free range: a $1,000 refundable security deposit is due in person before launch."]
      : []),
    `Please arrive 15 minutes early for the safety briefing.`,
    `${SITE_NAME}. Call ${SITE_PHONE}.`,
  ].join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE_NAME}//Booking//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${icsEscape(booking.id)}`,
    `DTSTAMP:${icsUtcStamp(new Date())}`,
    `DTSTART:${icsFloating(booking.startTime)}`,
    `DTEND:${icsFloating(booking.endTime)}`,
    `SUMMARY:${icsEscape(`${SITE_NAME}: ${booking.jetSki.name}`)}`,
    `LOCATION:${icsEscape(SITE_ADDRESS)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const body = lines.map(icsFold).join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="jetski-booking.ics"',
      "Cache-Control": "no-store",
    },
  });
}
