import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Container } from "@/components/ui";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import GalleryGrid, { type GalleryItem } from "@/components/GalleryGrid";

export const metadata: Metadata = {
  title: "Gallery",
  description: "A look at the Sea-Doo Spark Trixx and life on the Ottawa River at Blair Boat Launch.",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const media = await prisma.galleryMedia.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const items: GalleryItem[] = media.map((m, i) => ({
    src: m.url,
    caption: m.caption,
    type: m.type === "video" ? "video" : "image",
    // Give photos some masonry variety; videos stay 4:3.
    tall: m.type !== "video" && i % 3 === 0,
  }));
  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="Life on the Ottawa River"
        subtitle="A look at the Spark Trixx, the water, and the riders who make a day on the Ottawa River worth it."
      />
      <Container className="py-12 sm:py-16">
        <Reveal>
          <GalleryGrid items={items} />
        </Reveal>
      </Container>
    </>
  );
}
