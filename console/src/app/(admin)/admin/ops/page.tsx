import { Suspense } from "react";

import { EngineOpsClient } from "@/components/admin/ops/EngineOpsClient";

export default function AdminOpsPage() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
          <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Engine ops</h1>
          <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
            Fleet health: API and worker smoke checks, token burn from recent intel runs, RAG freshness by source type,
            queue snapshots, and dossier coverage signals. Refreshes every minute while this tab is open.
          </p>
        </div>
      </div>
      <Suspense fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading…</p>}>
        <EngineOpsClient className="mt-10" />
      </Suspense>
    </div>
  );
}
