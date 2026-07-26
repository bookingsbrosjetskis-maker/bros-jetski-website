import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { jsonError, readJson, unauthorized } from "../../_lib";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;

  const body = await readJson(req);
  if (!body || typeof body.approved !== "boolean") {
    return jsonError("approved (boolean) is required.");
  }

  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) return jsonError("Review not found.", 404);

  const review = await prisma.review.update({
    where: { id },
    data: { approved: body.approved },
  });
  return NextResponse.json({ ok: true, review });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;
  const res = await prisma.review.deleteMany({ where: { id } });
  if (res.count === 0) return jsonError("Review not found.", 404);
  return NextResponse.json({ ok: true });
}
