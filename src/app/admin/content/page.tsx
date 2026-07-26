import { prisma } from "@/lib/db";
import ContentEditor, {
  type SafetyFaq,
  type ContactInfo,
} from "@/components/admin/ContentEditor";

export const dynamic = "force-dynamic";

function parse<T>(json: string | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export default async function AdminContentPage() {
  const [faqRow, contactRow] = await Promise.all([
    prisma.siteContent.findUnique({ where: { key: "safety-faq" } }),
    prisma.siteContent.findUnique({ where: { key: "contact-info" } }),
  ]);

  const faq = parse<SafetyFaq>(faqRow?.json, {
    title: "Safety & FAQ",
    intro: "",
    sections: [],
  });
  const contact = parse<ContactInfo>(contactRow?.json, {
    name: "",
    address: "",
    phone: "",
    email: "",
    hours: [],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">Site content</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Edit the Safety &amp; FAQ page and your contact details. Changes go live immediately.
        </p>
      </div>
      <ContentEditor faq={faq} contact={contact} />
    </div>
  );
}
