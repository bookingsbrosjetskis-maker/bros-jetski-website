import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { Card } from "@/components/ui";
import LoginForm from "@/components/admin/LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  // Already signed in? Straight to the dashboard.
  if (await getAdminSession()) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <Card className="glass w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <p className="font-display text-xl font-extrabold tracking-tight text-cyan">Bros Jetskis</p>
          <h1 className="font-display mt-1 text-lg font-bold text-ink">Admin sign in</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Manage bookings, fleet and availability.
          </p>
        </div>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </Card>
    </div>
  );
}
