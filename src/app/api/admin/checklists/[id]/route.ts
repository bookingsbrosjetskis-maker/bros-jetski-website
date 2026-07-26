import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { jsonError, readJson, unauthorized } from "../../_lib";

type Params = { params: Promise<{ id: string }> };

/** Toggle the admin-reviewed flag on a submitted checklist. */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;

  const body = await readJson(req);
  if (!body || typeof body.read !== "boolean") {
    return jsonError("read (boolean) is required.");
  }

  const existing = await prisma.safetyChecklist.findUnique({ where: { id } });
  if (!existing) return jsonError("Checklist not found.", 404);

  const checklist = await prisma.safetyChecklist.update({
    where: { id },
    data: { read: body.read },
  });
  return NextResponse.json({ ok: true, checklist });
}
