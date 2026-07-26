import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export type StoredUpload = { url: string; type: "image" | "video" };

const IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif"]);
const VIDEO_EXT = new Set(["mp4", "webm", "mov", "m4v"]);

function classify(filename: string, mime: string): "image" | "video" | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (mime.startsWith("image/") || IMAGE_EXT.has(ext)) return "image";
  if (mime.startsWith("video/") || VIDEO_EXT.has(ext)) return "video";
  return null;
}

export class UploadError extends Error {}

/**
 * Persist an uploaded file and return its public URL + media type.
 *
 * Production: when BLOB_READ_WRITE_TOKEN is set, uploads go to Vercel Blob
 * (dynamic-imported so the package is not a hard dependency until deploy).
 * Dev: writes to public/uploads/ and serves from /uploads/. This mirrors the
 * app's "real service in prod, local stub in dev" convention (Stripe, Resend).
 */
export async function saveUpload(file: File): Promise<StoredUpload> {
  const type = classify(file.name, file.type);
  if (!type) throw new UploadError("Only image and video files are allowed.");

  // Whitelist the on-disk extension from the resolved media type rather than
  // echoing the client-supplied filename (which could carry an executable ext).
  const rawExt = (file.name.split(".").pop() || "").toLowerCase();
  const allowed = type === "image" ? IMAGE_EXT : VIDEO_EXT;
  const ext = allowed.has(rawExt) ? rawExt : type === "image" ? "jpg" : "mp4";
  const key = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    // Optional dependency, installed only at deploy time (`npm i @vercel/blob`).
    // Indirect the specifier so the type-checker/bundler doesn't require it here.
    const blobPkg = "@vercel/blob";
    const { put } = (await import(/* webpackIgnore: true */ blobPkg)) as {
      put: (path: string, body: File, opts: Record<string, unknown>) => Promise<{ url: string }>;
    };
    const blob = await put(`gallery/${key}`, file, {
      access: "public",
      contentType: file.type || undefined,
    });
    return { url: blob.url, type };
  }

  // Local dev fallback.
  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), bytes);
  return { url: `/uploads/${key}`, type };
}
