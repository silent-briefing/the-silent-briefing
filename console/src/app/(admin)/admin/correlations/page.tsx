import { Suspense } from "react";

import { CorrelationsQueueClient } from "@/components/admin/correlations/CorrelationsQueueClient";

export default function AdminCorrelationsPage() {
  return (
    <div>
      <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Correlations</h1>
      <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Proposed <span className="font-mono">entity_edges</span> from correlation passes. Accept to surface in the
        operator graph; reject keeps an audit trail without deleting. Escalate flags provenance for follow-up while
        leaving status proposed. Batch-accept requires an explicit confidence floor and confirmation.
      </p>
      <Suspense fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading queue…</p>}>
        <CorrelationsQueueClient className="mt-10" />
      </Suspense>
    </div>
  );
}
