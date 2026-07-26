// Edge-safe session token helpers (imported by middleware — must not pull in
// Prisma or bcrypt). Server-only auth lives in src/lib/auth.ts.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "admin_session";
export const SESSION_HOURS = 12;

export type AdminSession = { adminId: string; email: string; name: string };

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set (see .env.example)");
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(session: AdminSession): Promise<string> {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(secretKey());
}

/** Returns null on any failure (missing, expired, or tampered token). */
export async function verifySessionToken(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const { adminId, email, name } = payload as Record<string, unknown>;
    if (typeof adminId !== "string" || typeof email !== "string") return null;
    return { adminId, email, name: typeof name === "string" ? name : "" };
  } catch {
    return null;
  }
}
