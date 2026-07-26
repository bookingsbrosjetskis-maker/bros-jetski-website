import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { jsonError, unauthorized } from "../../_lib";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;
  const res = await prisma.blockedDate.deleteMany({ where: { id } });
  if (res.count === 0) return jsonError("Blocked date not found.", 404);
  return NextResponse.json({ ok: true });
}
