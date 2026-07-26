import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { jsonError, readJson, unauthorized } from "../../_lib";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;

  const body = await readJson(req);
  if (!body) return jsonError("Invalid JSON body.");
  // Default action is "mark read"; pass { read: false } to mark unread.
  const read = typeof body.read === "boolean" ? body.read : true;

  const existing = await prisma.contactMessage.findUnique({ where: { id } });
  if (!existing) return jsonError("Message not found.", 404);

  const message = await prisma.contactMessage.update({
    where: { id },
    data: { read },
  });
  return NextResponse.json({ ok: true, message });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;
  const res = await prisma.contactMessage.deleteMany({ where: { id } });
  if (res.count === 0) return jsonError("Message not found.", 404);
  return NextResponse.json({ ok: true });
}
