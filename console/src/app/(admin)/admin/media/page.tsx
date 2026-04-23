import { Suspense } from "react";

import { AdminMediaClient } from "@/components/admin/media/AdminMediaClient";

export default function AdminMediaPage() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Media coverage</h1>
          <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
            Curate headlines for search and dossier context. Tag officials for filtering; publishing controls authenticated
            visibility.
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading…</p>}>
        <AdminMediaClient className="mt-10" />
      </Suspense>
    </div>
  );
}
