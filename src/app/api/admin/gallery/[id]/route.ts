import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { jsonError, readJson, unauthorized } from "../../_lib";

type Params = { params: Promise<{ id: string }> };

/** Edit a gallery item's caption and/or display order. */
export async function PATCH(req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;

  const body = await readJson(req);
  if (!body) return jsonError("Invalid JSON body.");

  const data: { caption?: string; sortOrder?: number } = {};
  if (typeof body.caption === "string") data.caption = body.caption.trim().slice(0, 140);
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.trunc(body.sortOrder);
  }
  if (Object.keys(data).length === 0) return jsonError("Nothing to update.");

  const existing = await prisma.galleryMedia.findUnique({ where: { id } });
  if (!existing) return jsonError("Media not found.", 404);

  const media = await prisma.galleryMedia.update({ where: { id }, data });
  return NextResponse.json({ ok: true, media });
}

export async function DELETE(_req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { id } = await params;
  const res = await prisma.galleryMedia.deleteMany({ where: { id } });
  if (res.count === 0) return jsonError("Media not found.", 404);
  return NextResponse.json({ ok: true });
}
