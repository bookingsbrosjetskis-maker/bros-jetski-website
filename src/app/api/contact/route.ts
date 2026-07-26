import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_LENGTHS = { name: 200, email: 320, message: 5000 } as const;

export async function POST(request: Request) {
  const limited = rateLimit(`contact:${clientIp(request)}`, 5, 600_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Request body must be a JSON object." },
      { status: 400 },
    );
  }

  const { name, email, message } = body as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Please provide your name." },
      { status: 400 },
    );
  }
  if (
    typeof email !== "string" ||
    email.trim().length === 0 ||
    !EMAIL_RE.test(email.trim())
  ) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 },
    );
  }
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Please provide a message." },
      { status: 400 },
    );
  }
  if (
    name.trim().length > MAX_LENGTHS.name ||
    email.trim().length > MAX_LENGTHS.email ||
    message.trim().length > MAX_LENGTHS.message
  ) {
    return NextResponse.json(
      { error: "One or more fields are too long." },
      { status: 400 },
    );
  }

  const created = await prisma.contactMessage.create({
    data: {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    },
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
