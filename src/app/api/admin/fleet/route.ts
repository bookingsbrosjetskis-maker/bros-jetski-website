import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { jsonError, readJson, unauthorized } from "../_lib";
import { parseSkiInput } from "./ski-input";

export async function GET() {
  if (!(await getAdminSession())) return unauthorized();
  const jetSkis = await prisma.jetSki.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({ jetSkis });
}

export async function POST(req: Request) {
  if (!(await getAdminSession())) return unauthorized();
  const body = await readJson(req);
  if (!body) return jsonError("Invalid JSON body.");
  const parsed = parseSkiInput(body);
  if ("error" in parsed) return jsonError(parsed.error);
  const jetSki = await prisma.jetSki.create({ data: parsed.data });
  return NextResponse.json({ ok: true, jetSki }, { status: 201 });
}
