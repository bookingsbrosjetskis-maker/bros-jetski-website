// Server-only auth (uses Prisma + bcrypt). Edge-safe token code is in auth-token.ts.
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_HOURS,
  signSessionToken,
  verifySessionToken,
  type AdminSession,
} from "@/lib/auth-token";

export { SESSION_COOKIE, type AdminSession };

/** Validate credentials; returns a signed session token or null. */
export async function login(email: string, password: string): Promise<string | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
  if (!admin) return null;
  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return null;
  return signSessionToken({ adminId: admin.id, email: admin.email, name: admin.name });
}

/** Current admin session (server components / route handlers). */
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  };
}
