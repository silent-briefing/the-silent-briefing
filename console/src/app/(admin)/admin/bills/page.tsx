import Link from "next/link";
import { Suspense } from "react";

import { AdminBillsClient } from "@/components/admin/bills/AdminBillsClient";

export default function AdminBillsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Bills</h1>
          <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
            Legislative records for linking and publishing. Pair with{" "}
            <Link href="/admin/opinions" className="text-primary underline-offset-4 hover:underline">
              Opinions
            </Link>{" "}
            for citation graph work.
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading…</p>}>
        <AdminBillsClient className="mt-10" />
      </Suspense>
    </div>
  );
}
