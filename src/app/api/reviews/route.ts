import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Public review submission. Reviews are created unapproved and enter the
 * admin moderation queue. A hidden honeypot field ("website") traps bots:
 * if it's filled we return a fake success so the bot learns nothing. */
export async function POST(req: Request) {
  const limited = rateLimit(`reviews:${clientIp(req)}`, 5, 600_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  if (typeof b.website === "string" && b.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 }); // honeypot tripped
  }

  const authorName = typeof b.authorName === "string" ? b.authorName.trim() : "";
  const rating = typeof b.rating === "number" ? Math.round(b.rating) : NaN;
  const text = typeof b.text === "string" ? b.text.trim() : "";

  if (authorName.length < 2 || authorName.length > 100) {
    return NextResponse.json({ error: "Please enter your name (2 to 100 characters)." }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
  }
  if (text.length < 10 || text.length > 1500) {
    return NextResponse.json({ error: "Review must be 10 to 1500 characters." }, { status: 400 });
  }

  await prisma.review.create({
    data: { authorName, rating, text, approved: false },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
