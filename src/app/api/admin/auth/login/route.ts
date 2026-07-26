import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { login, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { jsonError, readJson } from "../../_lib";

export async function POST(req: Request) {
  // Throttle credential attempts per IP to blunt brute-force / password spray.
  const limited = rateLimit(`login:${clientIp(req)}`, 8, 60_000);
  if (!limited.ok) return tooManyRequests(limited.retryAfterSec);

  const body = await readJson(req);
  if (!body) return jsonError("Invalid JSON body.");
  const email = typeof body.email === "string" ? body.email : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return jsonError("Email and password are required.");

  const token = await login(email, password);
  if (!token) return jsonError("Invalid email or password.", 401);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
  return NextResponse.json({ ok: true });
}
