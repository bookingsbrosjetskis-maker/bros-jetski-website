import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { jsonError, readJson, unauthorized } from "../../_lib";
import { parseSkiInput } from "../ski-input";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;

  const body = await readJson(req);
  if (!body) return jsonError("Invalid JSON body.");
  const parsed = parseSkiInput(body);
  if ("error" in parsed) return jsonError(parsed.error);

  const existing = await prisma.jetSki.findUnique({ where: { id } });
  if (!existing) return jsonError("Jet ski not found.", 404);

  const jetSki = await prisma.jetSki.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true, jetSki });
}

export async function DELETE(req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;

  const ski = await prisma.jetSki.findUnique({
    where: { id },
    include: { _count: { select: { bookings: true } } },
  });
  if (!ski) return jsonError("Jet ski not found.", 404);

  if (ski._count.bookings > 0) {
    await prisma.jetSki.update({ where: { id }, data: { active: false } });
    return NextResponse.json({
      ok: true,
      softDeleted: true,
      message:
        "This jet ski has booking history, so it was deactivated (hidden from the public site) instead of deleted.",
    });
  }

  await prisma.blockedDate.deleteMany({ where: { jetSkiId: id } });
  await prisma.jetSki.delete({ where: { id } });
  return NextResponse.json({ ok: true, deleted: true });
}
