import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BookingStatus } from "@/lib/constants";
import { WAIVER_TEXT, WAIVER_VERSION } from "@/lib/waiver-text";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Whole years old today for a "YYYY-MM-DD" birth date, or null if it isn't a
 * real calendar date. Used to enforce the waiver's 18+ operator requirement. */
function ageFromDob(dob: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null; // e.g. 2020-02-31 rolled over
  }
  const now = new Date();
  let age = now.getUTCFullYear() - year;
  const monthDiff = now.getUTCMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < day)) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

export async function POST(req: Request) {
  const limited = rateLimit(`waiver:${clientIp(req)}`, 20, 600_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const bookingId = typeof b.bookingId === "string" ? b.bookingId : "";
  const signedName = typeof b.signedName === "string" ? b.signedName.trim() : "";
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  const agreed = b.agreed;
  const dateOfBirth = typeof b.dateOfBirth === "string" ? b.dateOfBirth.trim() : "";
  const address = typeof b.address === "string" ? b.address.trim() : "";
  const emergencyContactName =
    typeof b.emergencyContactName === "string" ? b.emergencyContactName.trim() : "";
  const emergencyContactPhone =
    typeof b.emergencyContactPhone === "string" ? b.emergencyContactPhone.trim() : "";

  if (!bookingId) {
    return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
  }
  if (agreed !== true) {
    return NextResponse.json({ error: "You must agree to the waiver to continue." }, { status: 400 });
  }
  if (!signedName || signedName.length > 120) {
    return NextResponse.json({ error: "Please type your full legal name to sign." }, { status: 400 });
  }
  if (!address || address.length > 240 || !emergencyContactName || emergencyContactName.length > 120) {
    return NextResponse.json({ error: "Please provide your address and an emergency contact." }, { status: 400 });
  }
  if (emergencyContactPhone.replace(/\D/g, "").length < 10 || emergencyContactPhone.length > 40) {
    return NextResponse.json({ error: "Please provide a valid emergency contact phone number." }, { status: 400 });
  }
  // Date of birth gates the waiver's 18+ operator requirement. Reject anything
  // that doesn't parse to a real date or that puts the signer under 18.
  const age = ageFromDob(dateOfBirth);
  if (age === null) {
    return NextResponse.json({ error: "Please provide a valid date of birth." }, { status: 400 });
  }
  if (age < 18) {
    return NextResponse.json({ error: "Renters must be at least 18 years old." }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  // Authorize by matching the booking's email so a third party who guesses a
  // bookingId cannot forge or overwrite someone else's waiver signature. The
  // 404 (not 403) avoids leaking whether the id exists.
  if (!booking || booking.email.toLowerCase() !== email) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking.status !== BookingStatus.PENDING) {
    return NextResponse.json({ error: "This booking can no longer be signed for." }, { status: 409 });
  }
  if (booking.expiresAt && booking.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "This booking hold has expired. Please start again." }, { status: 410 });
  }

  const fields = {
    signedName,
    agreed: true,
    waiverText: WAIVER_TEXT,
    waiverVersion: WAIVER_VERSION,
    dateOfBirth,
    address,
    emergencyContactName,
    emergencyContactPhone,
  };
  await prisma.waiver.upsert({
    where: { bookingId },
    create: { bookingId, ...fields },
    update: { ...fields, signedAt: new Date() },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
