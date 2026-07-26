import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ALL_ITEM_IDS, CHECKLIST_DETAIL_FIELDS } from "@/lib/checklist";
import { sendAdminChecklistSubmitted } from "@/lib/email";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Public endpoint: a customer submits their Rental Boat Safety Checklist using
 * the secret token from their post-payment email. Authorized by the token
 * alone (unguessable, per-booking); no login. */
export async function POST(req: Request) {
  const limited = rateLimit(`checklist:${clientIp(req)}`, 20, 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const b = body as Record<string, unknown>;

  const token = typeof b.token === "string" ? b.token : "";
  const signedName = typeof b.signedName === "string" ? b.signedName.trim() : "";
  const itemsRaw =
    b.items && typeof b.items === "object" ? (b.items as Record<string, unknown>) : {};
  const detailsRaw =
    b.details && typeof b.details === "object" ? (b.details as Record<string, unknown>) : {};

  if (!token) return NextResponse.json({ error: "Missing checklist token." }, { status: 400 });
  if (signedName.length < 2 || signedName.length > 120) {
    return NextResponse.json({ error: "Please type your full name to sign." }, { status: 400 });
  }

  // Every acknowledgement must be checked — this is a legal pre-ride attestation.
  if (!ALL_ITEM_IDS.every((id) => itemsRaw[id] === true)) {
    return NextResponse.json(
      { error: "Please acknowledge every item before submitting." },
      { status: 400 }
    );
  }

  const details: Record<string, string> = {};
  for (const field of CHECKLIST_DETAIL_FIELDS) {
    const value =
      typeof detailsRaw[field.id] === "string" ? (detailsRaw[field.id] as string).trim() : "";
    if (field.required && !value) {
      return NextResponse.json({ error: `${field.label} is required.` }, { status: 400 });
    }
    details[field.id] = value.slice(0, 200);
  }

  const checklist = await prisma.safetyChecklist.findUnique({
    where: { token },
    include: { booking: true },
  });
  if (!checklist) {
    return NextResponse.json({ error: "This checklist link is invalid or expired." }, { status: 404 });
  }

  const items: Record<string, boolean> = {};
  for (const id of ALL_ITEM_IDS) items[id] = true;

  await prisma.safetyChecklist.update({
    where: { id: checklist.id },
    data: {
      responsesJson: JSON.stringify({ items, details }),
      signedName,
      submittedAt: new Date(),
      read: false, // a fresh submission is unreviewed
    },
  });

  // Best-effort owner notification — must never block the customer.
  try {
    await sendAdminChecklistSubmitted(checklist.booking);
  } catch (err) {
    console.error("Checklist admin notification failed:", err);
  }

  return NextResponse.json({ ok: true });
}
