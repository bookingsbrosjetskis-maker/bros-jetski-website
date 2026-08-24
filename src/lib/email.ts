import type { Booking, JetSki } from "@prisma/client";
import { formatCAD, toDateKey, formatDate, formatBookingRange } from "@/lib/format";
import {
  SITE_NAME,
  SITE_PHONE,
  SITE_ADDRESS,
  RidingOption,
  CANCEL_CUTOFF_HOURS,
} from "@/lib/constants";

type EmailMessage = { to: string; subject: string; text: string };

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

/** Owner inbox for booking + checklist alerts. Configured at deploy time; when
 * unset, admin emails simply log to the dev console via send(). */
function adminEmail(): string {
  return process.env.ADMIN_NOTIFY_EMAIL || "admin@localhost";
}

/** Sends via Resend when RESEND_API_KEY is set; otherwise logs to the dev
 * console (the dev-mode stub required by the spec). Never throws — email
 * failure must not break a paid booking. */
async function send(message: EmailMessage): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      [
        "",
        "========== EMAIL (dev stub, set RESEND_API_KEY to send for real) ==========",
        `To:      ${message.to}`,
        `Subject: ${message.subject}`,
        "",
        message.text,
        "===========================================================================",
        "",
      ].join("\n")
    );
    return;
  }
  try {
    const { Resend } = await import("resend");
    await new Resend(apiKey).emails.send({
      from: process.env.EMAIL_FROM ?? "bookings@brosjetskisrental.ca",
      to: message.to,
      subject: message.subject,
      text: message.text,
    });
  } catch (err) {
    console.error("Email send failed (booking unaffected):", err);
  }
}

export async function sendBookingConfirmation(booking: Booking, jetSki: JetSki): Promise<void> {
  const freeRange = booking.ridingOption === RidingOption.FREE_RANGE;
  const skis = `${booking.quantity} ${booking.quantity === 1 ? "jet ski" : "jet skis"}`;
  const lines = [
    `Hi ${booking.customerName},`,
    "",
    `Your jet ski rental is confirmed! Here are the details:`,
    "",
    `  Jet ski:   ${jetSki.name} (${jetSki.horsepower} HP, seats ${jetSki.seats})`,
    `  Quantity:  ${skis}`,
    `  Date:      ${formatDate(toDateKey(booking.startTime))}`,
    `  Time:      ${formatBookingRange(booking.startTime, booking.endTime)}`,
    `  Riding:    ${freeRange ? "Free range" : "Designated riding area"}`,
    `  Rental:    ${formatCAD(booking.totalPrice)} CAD total`,
    `  Deposit:   ${formatCAD(booking.depositPaid)} CAD paid online`,
    `  Balance:   ${formatCAD(booking.balanceDue)} CAD due when you arrive`,
    `  Reference: ${booking.id}`,
    "",
  ];
  if (booking.balanceDue > 0) {
    lines.push(
      `Your ${formatCAD(booking.depositPaid)} deposit is not an extra fee — it comes off your`,
      `rental total. The remaining ${formatCAD(booking.balanceDue)} is due at the dock before you`,
      "ride. We take card (tap, chip, or phone) and cash.",
      ""
    );
  }
  lines.push(
    "Deposit policy:",
    `  - Cancel at least ${CANCEL_CUTOFF_HOURS} hours before your start time and your deposit is`,
    "    refunded in full.",
    "  - Late cancellations and no-shows forfeit the deposit.",
    "  - If we cancel for weather or anything on our end, you keep your deposit",
    "    or receive a full refund.",
    ""
  );
  if (freeRange) {
    lines.push(
      `Free range riding also requires a refundable ${formatCAD(booking.securityDeposit)} CAD security`,
      `deposit for your ${skis}. We will collect it in person before you launch and`,
      "return it in full once the jet skis are back safely.",
      ""
    );
  }
  lines.push(
    "What to bring:",
    "  - Pleasure Craft Operator Card (PCOC), or arrive early to complete a",
    "    Rental Boat Safety Checklist with us",
    "  - Government-issued photo ID",
    "  - Swimwear, towel, sunscreen. Life jackets and safety kit are included",
    "",
    "Please arrive 15 minutes early for the safety briefing.",
    "",
    `${SITE_NAME}`,
    `${SITE_ADDRESS} · ${SITE_PHONE}`
  );
  await send({
    to: booking.email,
    subject: `Booking confirmed: ${jetSki.name} on ${formatDate(toDateKey(booking.startTime))}`,
    text: lines.join("\n"),
  });
}

/** Email the customer a link to complete the Rental Boat Safety Checklist. */
export async function sendChecklistLink(booking: Booking, token: string): Promise<void> {
  const link = `${baseUrl()}/checklist/${token}`;
  await send({
    to: booking.email,
    subject: `Complete your safety checklist before you ride | ${SITE_NAME}`,
    text: [
      `Hi ${booking.customerName},`,
      "",
      "Before your ride, please complete the Rental Boat Safety Checklist online.",
      "It only takes a couple of minutes and helps us get you on the water faster:",
      "",
      `  ${link}`,
      "",
      "If you do not hold a Pleasure Craft Operator Card (PCOC), completing this",
      "checklist is required. Our rental agent will review and co-sign it with you",
      "at the dock, and a copy is kept on board for your rental.",
      "",
      `${SITE_NAME}`,
      `${SITE_ADDRESS} · ${SITE_PHONE}`,
    ].join("\n"),
  });
}

/** Alert the owner that a new booking was paid and confirmed. */
export async function sendAdminBookingNotification(booking: Booking, jetSki: JetSki): Promise<void> {
  const freeRange = booking.ridingOption === RidingOption.FREE_RANGE;
  await send({
    to: adminEmail(),
    subject: `New booking: ${booking.customerName}, ${booking.quantity}x, ${formatDate(toDateKey(booking.startTime))}`,
    text: [
      "A new booking has been paid and confirmed.",
      "",
      `  Customer:  ${booking.customerName}`,
      `  Email:     ${booking.email}`,
      `  Phone:     ${booking.phone}`,
      `  Jet ski:   ${jetSki.name} x ${booking.quantity}`,
      `  Date:      ${formatDate(toDateKey(booking.startTime))}`,
      `  Time:      ${formatBookingRange(booking.startTime, booking.endTime)}`,
      `  Riding:    ${freeRange ? `Free range (collect ${formatCAD(booking.securityDeposit)} security deposit in person)` : "Designated riding area"}`,
      `  Rental:    ${formatCAD(booking.totalPrice)} CAD total`,
      `  Deposit:   ${formatCAD(booking.depositPaid)} CAD paid online`,
      `  COLLECT:   ${formatCAD(booking.balanceDue)} CAD balance at the dock (card or cash)`,
      `  Reference: ${booking.id}`,
    ].join("\n"),
  });
}

/** Alert the owner that a customer submitted their safety checklist. */
export async function sendAdminChecklistSubmitted(booking: Booking): Promise<void> {
  await send({
    to: adminEmail(),
    subject: `Safety checklist submitted: ${booking.customerName}`,
    text: [
      `${booking.customerName} has completed their Rental Boat Safety Checklist online.`,
      "",
      `  Ride date: ${formatDate(toDateKey(booking.startTime))}`,
      `  Time:      ${formatBookingRange(booking.startTime, booking.endTime)}`,
      `  Reference: ${booking.id}`,
      "",
      "Review it under Admin > Checklists. Remember to co-sign it at the dock and",
      "keep a copy on board for the rental.",
    ].join("\n"),
  });
}

export async function sendBookingCancellation(booking: Booking, jetSki: JetSki): Promise<void> {
  await send({
    to: booking.email,
    subject: `Booking cancelled: ${jetSki.name} on ${formatDate(toDateKey(booking.startTime))}`,
    text: [
      `Hi ${booking.customerName},`,
      "",
      "Your jet ski rental has been cancelled as requested:",
      "",
      `  Jet ski:   ${jetSki.name} x ${booking.quantity}`,
      `  Date:      ${formatDate(toDateKey(booking.startTime))}`,
      `  Time:      ${formatBookingRange(booking.startTime, booking.endTime)}`,
      `  Reference: ${booking.id}`,
      "",
      `Your ${formatCAD(booking.depositPaid)} CAD deposit will be refunded to your original`,
      "payment method within 5 to 10 business days. Nothing else was charged online —",
      "the rental balance is only ever collected at the dock.",
      "",
      "We would love to get you on the water another day. Book any time at our website.",
      "",
      `${SITE_NAME}`,
      `${SITE_ADDRESS} · ${SITE_PHONE}`,
    ].join("\n"),
  });
}
