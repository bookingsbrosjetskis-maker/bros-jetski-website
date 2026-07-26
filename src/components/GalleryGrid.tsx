import Image from "next/image";
import AutoplayVideo from "@/components/AutoplayVideo";

// Masonry gallery. Each tile renders a real 2026-season photo or video clip
// from `public/`. Add or reorder tiles freely, the layout needs no other change.
export type GalleryItem = {
  src: string;
  caption: string;
  tall?: boolean;
  type?: "image" | "video";
};

export const galleryItems: GalleryItem[] = [
  { src: "/photos/lineup-sunset.jpg", caption: "Sunset lineup on the Ottawa River", tall: true },
  { src: "/videos/hero.mp4", caption: "Out on the water", type: "video" },
  { src: "/photos/ride-action.jpg", caption: "Two-up on the Spark Trixx", tall: true },
  { src: "/videos/ride-1.mp4", caption: "Carving the river", type: "video" },
  { src: "/photos/spark-duo.jpg", caption: "Spark Trixx, built for beginners", tall: true },
  { src: "/videos/ride-2.mp4", caption: "Full throttle on the Ottawa", type: "video" },
  { src: "/photos/beach-trio.jpg", caption: "Ready to launch at Blair Boat Launch" },
];

export default function GalleryGrid({ items }: { items?: GalleryItem[] }) {
  const tiles = items && items.length > 0 ? items : galleryItems;
  return (
    <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
      {tiles.map((item, i) => (
        <figure
          key={i}
          className="group relative block break-inside-avoid overflow-hidden rounded-2xl border border-outline-variant/60 shadow-lg shadow-black/40 transition-colors duration-300 hover:border-cyan/40"
        >
          <div className={`relative ${item.tall ? "aspect-[3/4]" : "aspect-[4/3]"}`}>
            <div className="absolute inset-0 bg-surface-low" />
            {item.type === "video" ? (
              <AutoplayVideo
                src={item.src}
                lazy
                label={item.caption}
                controlClassName="bottom-2 right-2 h-8 w-8"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            ) : (
              <Image
                src={item.src}
                alt={item.caption}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-lowest/70 via-transparent to-transparent" />
          </div>
          <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-surface-lowest/90 to-transparent p-4 font-label text-xs font-bold uppercase tracking-[0.08em] text-ink opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
            {item.caption}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
