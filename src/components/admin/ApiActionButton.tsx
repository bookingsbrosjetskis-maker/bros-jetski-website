"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";

/** Small client island: fires a JSON request against an admin API route,
 * optionally after a confirm step, then refreshes the server components. */
export default function ApiActionButton({
  url,
  method = "PATCH",
  body,
  confirmText,
  variant = "outline",
  small = false,
  className = "",
  children,
}: {
  url: string;
  method?: "PATCH" | "DELETE" | "POST";
  body?: Record<string, unknown>;
  confirmText?: string;
  variant?: "primary" | "secondary" | "outline" | "danger";
  small?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        warning?: string;
      };
      if (!res.ok) {
        window.alert(data.error ?? "Something went wrong.");
      } else if (data.message || data.warning) {
        window.alert(data.message ?? data.warning);
      }
      router.refresh();
    } catch {
      window.alert("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={variant}
      disabled={busy}
      onClick={run}
      className={`${small ? "px-3! py-1.5! text-xs!" : ""} ${className}`}
    >
      {children}
    </Button>
  );
}
