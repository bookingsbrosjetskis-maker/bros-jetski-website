import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getAdminSession } from "@/lib/auth";
import AdminNav from "@/components/admin/AdminNav";
import { Container } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Bros Jetskis Rental",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();

  // No session: this is the /admin/login render (middleware redirects every
  // other admin page) — show the bare page without admin chrome.
  if (!session) return <>{children}</>;

  return (
    <div className="min-h-screen bg-surface">
      <AdminNav name={session.name || session.email} />
      <main className="lg:pl-60">
        <Container className="py-6 lg:py-10">
          {children}
        </Container>
      </main>
    </div>
  );
}
