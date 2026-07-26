import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { saveUpload, UploadError } from "@/lib/storage";
import { unauthorized } from "../_lib";

export const dynamic = "force-dynamic";

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

/** Upload a new gallery photo or video (multipart form: file, optional caption). */
export async function POST(req: Request) {
  if (!(await getAdminSession())) return unauthorized();

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a multipart form upload." }, { status: 400 });
  }

  const file = form.get("file");
  const captionRaw = form.get("caption");
  const caption = typeof captionRaw === "string" ? captionRaw.trim().slice(0, 140) : "";

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (50 MB maximum)." }, { status: 413 });
  }

  try {
    const { url, type } = await saveUpload(file);
    const max = await prisma.galleryMedia.aggregate({ _max: { sortOrder: true } });
    const media = await prisma.galleryMedia.create({
      data: { url, type, caption, sortOrder: (max._max.sortOrder ?? -1) + 1 },
    });
    return NextResponse.json({ ok: true, media }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("Gallery upload failed:", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
