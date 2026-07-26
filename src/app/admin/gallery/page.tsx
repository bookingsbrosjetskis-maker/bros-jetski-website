import { prisma } from "@/lib/db";
import GalleryManager from "@/components/admin/GalleryManager";

export const dynamic = "force-dynamic";

export default async function AdminGalleryPage() {
  const items = await prisma.galleryMedia.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Gallery</h1>
        <p className="mt-1 text-sm text-ink-muted">
          These photos and videos appear on the public gallery page, ordered by the number below
          (lowest first).
        </p>
      </div>
      <GalleryManager items={items} />
    </div>
  );
}
