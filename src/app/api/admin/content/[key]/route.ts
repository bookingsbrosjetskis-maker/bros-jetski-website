import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/auth";
import { jsonError, readJson, unauthorized } from "../../_lib";

type Params = { params: Promise<{ key: string }> };

const ALLOWED_KEYS = ["safety-faq", "contact-info"] as const;
type ContentKey = (typeof ALLOWED_KEYS)[number];

function isAllowedKey(key: string): key is ContentKey {
  return (ALLOWED_KEYS as readonly string[]).includes(key);
}

function str(v: unknown): v is string {
  return typeof v === "string";
}

/** Validate + normalize the payload for a given content key. Returns the
 * cleaned object, or an error message string. */
function validate(key: ContentKey, data: unknown): { data: unknown } | { error: string } {
  if (typeof data !== "object" || data === null) return { error: "Invalid content payload." };
  const d = data as Record<string, unknown>;

  if (key === "safety-faq") {
    if (!str(d.title) || !d.title.trim()) return { error: "Title is required." };
    if (!str(d.intro)) return { error: "Intro is required." };
    if (!Array.isArray(d.sections)) return { error: "Sections must be a list." };
    const sections = [];
    for (const s of d.sections) {
      if (typeof s !== "object" || s === null) return { error: "Each section must be an object." };
      const sec = s as Record<string, unknown>;
      if (!str(sec.heading) || !sec.heading.trim()) return { error: "Every section needs a heading." };
      if (!Array.isArray(sec.items)) return { error: "Each section needs an items list." };
      const items = [];
      for (const it of sec.items) {
        if (typeof it !== "object" || it === null) return { error: "Each FAQ item must be an object." };
        const item = it as Record<string, unknown>;
        if (!str(item.q) || !item.q.trim()) return { error: "Every question needs text." };
        if (!str(item.a)) return { error: "Every answer needs text." };
        items.push({ q: item.q.trim(), a: item.a.trim() });
      }
      sections.push({ heading: sec.heading.trim(), items });
    }
    return { data: { title: d.title.trim(), intro: d.intro.trim(), sections } };
  }

  // contact-info
  for (const f of ["name", "address", "phone", "email"]) {
    if (!str(d[f]) || !(d[f] as string).trim()) return { error: `${f} is required.` };
  }
  if (!Array.isArray(d.hours)) return { error: "Hours must be a list." };
  const hours = [];
  for (const h of d.hours) {
    if (typeof h !== "object" || h === null) return { error: "Each hours row must be an object." };
    const hr = h as Record<string, unknown>;
    if (!str(hr.days) || !str(hr.hours)) return { error: "Each hours row needs days and hours." };
    hours.push({ days: hr.days.trim(), hours: hr.hours.trim() });
  }
  return {
    data: {
      name: (d.name as string).trim(),
      address: (d.address as string).trim(),
      phone: (d.phone as string).trim(),
      email: (d.email as string).trim(),
      hours,
    },
  };
}

export async function GET(_req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { key } = await params;
  if (!isAllowedKey(key)) return jsonError("Unknown content key.", 404);

  const row = await prisma.siteContent.findUnique({ where: { key } });
  if (!row) return jsonError("Content not found.", 404);

  let data: unknown = null;
  try {
    data = JSON.parse(row.json);
  } catch {
    return jsonError("Stored content is corrupt.", 500);
  }
  return NextResponse.json({ key, data });
}

export async function PATCH(req: Request, { params }: Params) {
  if (!(await getAdminSession())) return unauthorized();
  const { key } = await params;
  if (!isAllowedKey(key)) return jsonError("Unknown content key.", 404);

  const body = await readJson(req);
  if (!body || !("data" in body)) return jsonError("Request body must include a `data` object.");

  const result = validate(key, body.data);
  if ("error" in result) return jsonError(result.error);

  await prisma.siteContent.upsert({
    where: { key },
    create: { key, json: JSON.stringify(result.data) },
    update: { json: JSON.stringify(result.data) },
  });
  return NextResponse.json({ ok: true });
}
