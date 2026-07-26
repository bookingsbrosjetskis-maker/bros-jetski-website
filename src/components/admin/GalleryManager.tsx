"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Label } from "@/components/ui";

export type GalleryRow = {
  id: string;
  url: string;
  caption: string;
  type: string;
  sortOrder: number;
};

export default function GalleryManager({ items }: { items: GalleryRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onUpload(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please choose a photo or video to upload.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("caption", caption);
      const res = await fetch("/api/admin/gallery", { method: "POST", body: form });
      if (res.ok) {
        setCaption("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Upload failed. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="font-display text-lg font-bold text-ink">Add media</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Upload a photo (JPG, PNG, WebP) or a short video (MP4, WebM). 50 MB maximum.
        </p>
        <form onSubmit={onUpload} className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-4">
            <div>
              <Label htmlFor="gallery-file">File</Label>
              <input
                id="gallery-file"
                ref={fileRef}
                type="file"
                accept="image/*,video/*"
                className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-high file:px-4 file:py-2 file:text-sm file:font-semibold file:text-ink hover:file:bg-surface-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
              />
            </div>
            <div>
              <Label htmlFor="gallery-caption">Caption</Label>
              <Input
                id="gallery-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Sunset on the Ottawa River"
              />
            </div>
          </div>
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        </form>
        {error && (
          <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300 ring-1 ring-inset ring-red-400/30">
            {error}
          </p>
        )}
      </Card>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-muted">
          No gallery media yet. Upload your first photo or video above.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <GalleryItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function GalleryItemCard({ item }: { item: GalleryRow }) {
  const router = useRouter();
  const [caption, setCaption] = useState(item.caption);
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const [busy, setBusy] = useState(false);

  const dirty = caption !== item.caption || sortOrder !== String(item.sortOrder);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/gallery/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption, sortOrder: Number(sortOrder) }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(data.error ?? "Could not save changes.");
      } else {
        router.refresh();
      }
    } catch {
      window.alert("Network error. Please try again.");
    }
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm("Delete this media permanently?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/gallery/${item.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        window.alert(data.error ?? "Could not delete.");
      } else {
        router.refresh();
      }
    } catch {
      window.alert("Network error. Please try again.");
    }
    setBusy(false);
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[4/3] bg-surface-low">
        {item.type === "video" ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video src={item.url} muted playsInline className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt={item.caption} className="h-full w-full object-cover" />
        )}
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium uppercase text-white">
          {item.type}
        </span>
      </div>
      <div className="space-y-3 p-4">
        <div>
          <Label htmlFor={`cap-${item.id}`}>Caption</Label>
          <Input
            id={`cap-${item.id}`}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
        <div className="flex items-end gap-3">
          <div className="w-24">
            <Label htmlFor={`ord-${item.id}`}>Order</Label>
            <Input
              id={`ord-${item.id}`}
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>
          <div className="flex flex-1 justify-end gap-2">
            <Button variant="secondary" onClick={save} disabled={busy || !dirty} className="px-4! py-1.5! text-xs!">
              Save
            </Button>
            <Button variant="danger" onClick={remove} disabled={busy} className="px-4! py-1.5! text-xs!">
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
