import type { Booking, JetSki } from "@prisma/client";
import { formatCAD, toDateKey, formatDate, formatBookingRange } from "@/lib/format";
import {
  SITE_NAME,
  SITE_PHONE,
  SITE_ADDRESS,
  RidingOption,
  CANCEL_CUTOFF_HOURS,
} from "@/lib/constants";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  /** Set on enquiry alerts so the owner can just hit Reply to reach the sender. */
  replyTo?: string;
};

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

/**
 * Resend's shared sandbox sender. It needs no DNS, so mail works the day the
 * site goes up — but Resend only delivers sandbox mail to the address that owns
 * the Resend account. The moment the business's own domain is bought and
 * verified in Resend, set EMAIL_FROM and every message below starts sending
 * from it. Nothing else in the code needs to change.
 */
const SANDBOX_FROM = "onboarding@resend.dev";

/** The From: header for all outbound mail. */
export function fromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || SANDBOX_FROM;
}

/** Owner inbox for booking, enquiry, review, and checklist alerts. */
export function adminEmail(): string {
  return process.env.ADMIN_NOTIFY_EMAIL?.trim() || "";
}

export type EmailConfigStatus = {
  /** Mail actually leaves the building (a Resend key is present). */
  live: boolean;
  from: string;
  /** True while still on Resend's sandbox sender (no custom domain yet). */
  usingSandboxSender: boolean;
  adminInbox: string;
  /** Human-readable blockers, in the order worth fixing. */
  warnings: string[];
};

/**
 * What is and is not configured for email. Surfaced on the admin dashboard so
 * the owner can see at a glance whether notifications are really going out,
 * and exactly which environment variable is still missing.
 */
export function emailConfigStatus(): EmailConfigStatus {
  const live = Boolean(process.env.RESEND_API_KEY);
  const from = fromAddress();
  const usingSandboxSender = from === SANDBOX_FROM;
  const adminInbox = adminEmail();
  const warnings: string[] = [];

  if (!live) {
    warnings.push(
      "RESEND_API_KEY is not set — no mail is being sent. Messages are written to the server log instead."
    );
  }
  if (!adminInbox) {
    warnings.push(
      "ADMIN_NOTIFY_EMAIL is not set — nobody is being alerted to new bookings, enquiries, or reviews."
    );
  }
  if (usingSandboxSender) {
    warnings.push(
      "EMAIL_FROM is not set, so mail sends from Resend's sandbox address, which only delivers to the Resend account owner. Once the domain is bought and verified in Resend, set EMAIL_FROM to something like \"Bros Jetskis Rental <bookings@yourdomain.ca>\"."
    );
  }
  return { live, from, usingSandboxSender, adminInbox, warnings };
}

/** Sends via Resend when RESEND_API_KEY is set; otherwise logs to the dev
 * console (the dev-mode stub required by the spec). Never throws — email
 * failure must not break a paid booking. */
async function send(message: EmailMessage): Promise<void> {
  // An unset owner inbox would otherwise send owner alerts to "" and throw.
  if (!message.to) {
    console.warn(
      `Email skipped ("${message.subject}"): no recipient. Set ADMIN_NOTIFY_EMAIL to receive owner alerts.`
    );
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      [
        "",
        "========== EMAIL (dev stub, set RESEND_API_KEY to send for real) ==========",
        `To:      ${message.to}`,
        ...(message.replyTo ? [`ReplyTo: ${message.replyTo}`] : []),
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
    const { error } = await new Resend(apiKey).emails.send({
      from: fromAddress(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });
    // Resend reports delivery problems in the body, not by throwing — an
    // unverified sending domain shows up here and would otherwise pass silently.
    if (error) {
      console.error(`Email rejected by Resend ("${message.subject}"):`, error);
    }
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

/** The three public forms all POST to /api/contact, tagging the message with a
 * prefix. Recover which one it was so the owner's alert says so in the subject
 * instead of every enquiry looking identical. */
function enquiryKind(message: string): { label: string; subject: string } {
  if (message.startsWith("[CORPORATE EVENT INQUIRY]")) {
    return { label: "Corporate event enquiry", subject: "a corporate event" };
  }
  if (message.startsWith("[GIFT CARD INQUIRY]")) {
    return { label: "Gift card enquiry", subject: "a gift card" };
  }
  return { label: "Website enquiry", subject: "your enquiry" };
}

/** Who ended the booking. The deposit outcome differs, and the client was
 * explicit that a cancellation on the business's side must never cost the
 * customer their deposit. */
export type CancelledBy = "customer" | "business";

export async function sendBookingCancellation(
  booking: Booking,
  jetSki: JetSki,
  cancelledBy: CancelledBy = "customer",
  reason?: string
): Promise<void> {
  const byBusiness = cancelledBy === "business";
  const lines = [
    `Hi ${booking.customerName},`,
    "",
    byBusiness
      ? "We are sorry — we have had to cancel your jet ski rental:"
      : "Your jet ski rental has been cancelled as requested:",
    "",
    `  Jet ski:   ${jetSki.name} x ${booking.quantity}`,
    `  Date:      ${formatDate(toDateKey(booking.startTime))}`,
    `  Time:      ${formatBookingRange(booking.startTime, booking.endTime)}`,
    `  Reference: ${booking.id}`,
    "",
  ];

  if (reason) lines.push(`Reason: ${reason}`, "");

  if (byBusiness) {
    lines.push(
      "Because we cancelled, you do not lose anything. Your",
      `${formatCAD(booking.depositPaid)} CAD deposit is not forfeited: we will either move you`,
      "to another time at no extra cost, or refund it in full to your original",
      "payment method within 5 to 10 business days — whichever you prefer.",
      "",
      `Just reply to this email or call ${SITE_PHONE} and we will sort it out.`,
      ""
    );
  } else {
    lines.push(
      `Your ${formatCAD(booking.depositPaid)} CAD deposit will be refunded to your original`,
      "payment method within 5 to 10 business days. Nothing else was charged online —",
      "the rental balance is only ever collected at the dock.",
      "",
      "We would love to get you on the water another day. Book any time at our website.",
      ""
    );
  }

  lines.push(`${SITE_NAME}`, `${SITE_ADDRESS} · ${SITE_PHONE}`);

  await send({
    to: booking.email,
    subject: byBusiness
      ? `We had to cancel your ${formatDate(toDateKey(booking.startTime))} rental`
      : `Booking cancelled: ${jetSki.name} on ${formatDate(toDateKey(booking.startTime))}`,
    text: lines.join("\n"),
  });
}

/** Owner alert for a new contact / corporate / gift-card enquiry. Reply-to is
 * the sender, so the owner answers straight from their inbox. */
export async function sendAdminContactNotification(msg: {
  id: string;
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  const kind = enquiryKind(msg.message);
  await send({
    to: adminEmail(),
    replyTo: msg.email,
    subject: `${kind.label}: ${msg.name}`,
    text: [
      `A new ${kind.label.toLowerCase()} came in through the website.`,
      "",
      `  Name:    ${msg.name}`,
      `  Email:   ${msg.email}`,
      "",
      "Message:",
      msg.message,
      "",
      "Reply to this email to answer them directly.",
      `Or read it in the admin area: ${baseUrl()}/admin/messages`,
    ].join("\n"),
  });
}

/** Confirmation to whoever sent an enquiry, so they know it landed. */
export async function sendContactAcknowledgement(msg: {
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  const kind = enquiryKind(msg.message);
  await send({
    to: msg.email,
    subject: `We got your message | ${SITE_NAME}`,
    text: [
      `Hi ${msg.name},`,
      "",
      `Thanks for getting in touch about ${kind.subject}. We have your message and`,
      "a real person will get back to you shortly.",
      "",
      "For anything urgent, call us — that is always fastest:",
      `  ${SITE_PHONE}`,
      "",
      "For reference, here is what you sent:",
      "",
      msg.message,
      "",
      `${SITE_NAME}`,
      `${SITE_ADDRESS} · ${SITE_PHONE}`,
    ].join("\n"),
  });
}

/** Owner alert that a review is waiting for approval (reviews stay hidden
 * until approved, so an unseen one never reaches the site). */
export async function sendAdminReviewNotification(review: {
  authorName: string;
  rating: number;
  text: string;
}): Promise<void> {
  await send({
    to: adminEmail(),
    subject: `New ${review.rating}-star review from ${review.authorName} (awaiting approval)`,
    text: [
      "Someone left a review on the website. It stays hidden until you approve it.",
      "",
      `  Author: ${review.authorName}`,
      `  Rating: ${review.rating} out of 5`,
      "",
      "Review:",
      review.text,
      "",
      `Approve or remove it here: ${baseUrl()}/admin/reviews`,
    ].join("\n"),
  });
}
