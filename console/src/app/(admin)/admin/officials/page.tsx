import Link from "next/link";
import { Suspense } from "react";

import { AdminOfficialsList } from "@/components/admin/officials/AdminOfficialsList";
import { buttonVariants } from "@/components/ui/button";

export default function AdminOfficialsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Officials</h1>
          <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
            Create and curate elected officials and judges. Filters match the operator roster; changes are
            audit-logged on the server.
          </p>
        </div>
        <Link href="/admin/officials/new" className={buttonVariants({ variant: "default" })}>
          New official
        </Link>
      </div>
      <Suspense
        fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading table…</p>}
      >
        <AdminOfficialsList className="mt-10" />
      </Suspense>
    </div>
  );
}
