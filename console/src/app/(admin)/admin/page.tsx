import { AdminDashboardTiles } from "@/components/admin/AdminDashboardTiles";
import { fetchAdminDashboardStats } from "@/lib/admin/dashboard-stats";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();
  const stats = await fetchAdminDashboardStats(supabase);

  return (
    <div>
      <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin dashboard</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-primary">Control room</h1>
      <p className="mt-4 max-w-prose font-sans text-base leading-relaxed text-[var(--fg-3)]">
        Ten curation and engine concerns — each links to a dedicated workflow. Counts below respect
        your Clerk session and Supabase RLS.
      </p>
      <AdminDashboardTiles stats={stats} />
    </div>
  );
}
