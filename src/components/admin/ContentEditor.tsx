"use client";

import { useState } from "react";
import { Button, Card, Input, Label, Textarea } from "@/components/ui";

export type FaqItem = { q: string; a: string };
export type FaqSection = { heading: string; items: FaqItem[] };
export type SafetyFaq = { title: string; intro: string; sections: FaqSection[] };
export type HoursRow = { days: string; hours: string };
export type ContactInfo = {
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: HoursRow[];
};

type Tab = "safety-faq" | "contact-info";
type SaveState = "idle" | "saving" | "saved" | "error";

async function saveContent(key: Tab, data: unknown): Promise<string | null> {
  try {
    const res = await fetch(`/api/admin/content/${key}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
    if (res.ok) return null;
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? "Save failed. Please try again.";
  } catch {
    return "We couldn't reach the server. Please try again.";
  }
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-7 w-7 items-center justify-center rounded-md border border-outline-variant text-ink-muted transition-colors hover:border-cyan hover:text-cyan disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function SaveBar({ state, error, onSave, dirty }: {
  state: SaveState;
  error: string;
  onSave: () => void;
  dirty: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-t border-outline-variant/50 pt-4">
      <Button onClick={onSave} disabled={state === "saving"}>
        {state === "saving" ? "Saving…" : "Save changes"}
      </Button>
      {state === "saved" && !dirty && <span className="text-sm text-emerald-300">Saved ✓</span>}
      {dirty && state !== "saving" && <span className="text-sm text-amber-300">Unsaved changes</span>}
      {state === "error" && <span className="text-sm text-red-300">{error}</span>}
    </div>
  );
}

const upDown = {
  up: <path d="M6 15l6-6 6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
};
const Ico = ({ d }: { d: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
);

export default function ContentEditor({
  faq: initialFaq,
  contact: initialContact,
}: {
  faq: SafetyFaq;
  contact: ContactInfo;
}) {
  const [tab, setTab] = useState<Tab>("safety-faq");

  const [faq, setFaq] = useState<SafetyFaq>(initialFaq);
  const [faqDirty, setFaqDirty] = useState(false);
  const [faqState, setFaqState] = useState<SaveState>("idle");
  const [faqError, setFaqError] = useState("");

  const [contact, setContact] = useState<ContactInfo>(initialContact);
  const [contactDirty, setContactDirty] = useState(false);
  const [contactState, setContactState] = useState<SaveState>("idle");
  const [contactError, setContactError] = useState("");

  function updateFaq(next: SafetyFaq) {
    setFaq(next);
    setFaqDirty(true);
    setFaqState("idle");
  }
  function updateContact(next: ContactInfo) {
    setContact(next);
    setContactDirty(true);
    setContactState("idle");
  }

  async function onSaveFaq() {
    setFaqState("saving");
    const err = await saveContent("safety-faq", faq);
    if (err) {
      setFaqError(err);
      setFaqState("error");
    } else {
      setFaqDirty(false);
      setFaqState("saved");
    }
  }
  async function onSaveContact() {
    setContactState("saving");
    const err = await saveContent("contact-info", contact);
    if (err) {
      setContactError(err);
      setContactState("error");
    } else {
      setContactDirty(false);
      setContactState("saved");
    }
  }

  function switchTab(next: Tab) {
    if (next === tab) return;
    const leavingDirty = tab === "safety-faq" ? faqDirty : contactDirty;
    if (leavingDirty && !window.confirm("You have unsaved changes on this tab. Switch anyway?")) return;
    setTab(next);
  }

  return (
    <div>
      <div className="mb-6 inline-flex rounded-xl border border-outline-variant bg-surface-low p-1">
        {([["safety-faq", "Safety & FAQ"], ["contact-info", "Contact info"]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => switchTab(k)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === k ? "bg-cyan/15 text-cyan ring-1 ring-inset ring-cyan/40" : "text-ink-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "safety-faq" ? (
        <Card className="space-y-6 p-6">
          <div>
            <Label htmlFor="faq-title">Page title</Label>
            <Input id="faq-title" value={faq.title} onChange={(e) => updateFaq({ ...faq, title: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="faq-intro">Intro</Label>
            <Textarea id="faq-intro" rows={3} value={faq.intro} onChange={(e) => updateFaq({ ...faq, intro: e.target.value })} />
          </div>

          <div className="space-y-5">
            {faq.sections.map((section, si) => (
              <div key={si} className="rounded-xl border border-outline-variant p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Input
                    value={section.heading}
                    placeholder="Section heading"
                    className="font-semibold"
                    onChange={(e) => {
                      const sections = [...faq.sections];
                      sections[si] = { ...section, heading: e.target.value };
                      updateFaq({ ...faq, sections });
                    }}
                  />
                  <IconButton label="Move section up" onClick={() => updateFaq({ ...faq, sections: move(faq.sections, si, si - 1) })}><Ico d={upDown.up} /></IconButton>
                  <IconButton label="Move section down" onClick={() => updateFaq({ ...faq, sections: move(faq.sections, si, si + 1) })}><Ico d={upDown.down} /></IconButton>
                  <IconButton label="Remove section" onClick={() => updateFaq({ ...faq, sections: faq.sections.filter((_, i) => i !== si) })}><Ico d={upDown.x} /></IconButton>
                </div>
                <div className="space-y-3">
                  {section.items.map((item, ii) => (
                    <div key={ii} className="rounded-lg bg-surface-low p-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={item.q}
                          placeholder="Question"
                          onChange={(e) => {
                            const sections = [...faq.sections];
                            const items = [...section.items];
                            items[ii] = { ...item, q: e.target.value };
                            sections[si] = { ...section, items };
                            updateFaq({ ...faq, sections });
                          }}
                        />
                        <IconButton label="Move item up" onClick={() => { const sections = [...faq.sections]; sections[si] = { ...section, items: move(section.items, ii, ii - 1) }; updateFaq({ ...faq, sections }); }}><Ico d={upDown.up} /></IconButton>
                        <IconButton label="Move item down" onClick={() => { const sections = [...faq.sections]; sections[si] = { ...section, items: move(section.items, ii, ii + 1) }; updateFaq({ ...faq, sections }); }}><Ico d={upDown.down} /></IconButton>
                        <IconButton label="Remove item" onClick={() => { const sections = [...faq.sections]; sections[si] = { ...section, items: section.items.filter((_, i) => i !== ii) }; updateFaq({ ...faq, sections }); }}><Ico d={upDown.x} /></IconButton>
                      </div>
                      <Textarea
                        className="mt-2"
                        rows={2}
                        value={item.a}
                        placeholder="Answer"
                        onChange={(e) => {
                          const sections = [...faq.sections];
                          const items = [...section.items];
                          items[ii] = { ...item, a: e.target.value };
                          sections[si] = { ...section, items };
                          updateFaq({ ...faq, sections });
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const sections = [...faq.sections];
                      sections[si] = { ...section, items: [...section.items, { q: "", a: "" }] };
                      updateFaq({ ...faq, sections });
                    }}
                    className="text-sm font-medium text-cyan hover:text-cyan-soft"
                  >
                    + Add question
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateFaq({ ...faq, sections: [...faq.sections, { heading: "", items: [] }] })}
              className="rounded-lg border border-dashed border-outline-variant px-4 py-2 text-sm font-medium text-ink-muted hover:border-cyan hover:text-cyan"
            >
              + Add section
            </button>
          </div>

          <SaveBar state={faqState} error={faqError} onSave={onSaveFaq} dirty={faqDirty} />
        </Card>
      ) : (
        <Card className="space-y-5 p-6">
          {([["name", "Business name"], ["address", "Address"], ["phone", "Phone"], ["email", "Email"]] as const).map(([field, label]) => (
            <div key={field}>
              <Label htmlFor={`c-${field}`}>{label}</Label>
              <Input
                id={`c-${field}`}
                value={contact[field]}
                onChange={(e) => updateContact({ ...contact, [field]: e.target.value })}
              />
            </div>
          ))}

          <div>
            <Label>Hours</Label>
            <div className="space-y-2">
              {contact.hours.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={row.days}
                    placeholder="Days (e.g. Mon to Fri)"
                    onChange={(e) => { const hours = [...contact.hours]; hours[i] = { ...row, days: e.target.value }; updateContact({ ...contact, hours }); }}
                  />
                  <Input
                    value={row.hours}
                    placeholder="Hours (e.g. 9 AM to sunset)"
                    onChange={(e) => { const hours = [...contact.hours]; hours[i] = { ...row, hours: e.target.value }; updateContact({ ...contact, hours }); }}
                  />
                  <IconButton label="Remove row" onClick={() => updateContact({ ...contact, hours: contact.hours.filter((_, j) => j !== i) })}><Ico d={upDown.x} /></IconButton>
                </div>
              ))}
              <button
                type="button"
                onClick={() => updateContact({ ...contact, hours: [...contact.hours, { days: "", hours: "" }] })}
                className="text-sm font-medium text-cyan hover:text-cyan-soft"
              >
                + Add hours row
              </button>
            </div>
          </div>

          <SaveBar state={contactState} error={contactError} onSave={onSaveContact} dirty={contactDirty} />
        </Card>
      )}
    </div>
  );
}
