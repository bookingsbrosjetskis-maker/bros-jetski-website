// Shared helpers for admin API routes (not a route file).
import { NextResponse } from "next/server";

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

/** Parse a JSON body, returning null on malformed input. */
export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await req.json()) as unknown;
    if (typeof body !== "object" || body === null) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}
