import { Suspense } from "react";

import { IntelRunsListClient } from "@/components/admin/runs/IntelRunsListClient";

export default function AdminRunsPage() {
  return (
    <div>
      <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Intel runs</h1>
      <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Observability for <span className="font-mono">intelligence_runs</span>: status, model, tokens, groundedness,
        pipeline stage, and idempotency keys. Trigger on-demand jobs against the worker CLI; detail pages poll every
        three seconds until a terminal status.
      </p>
      <Suspense fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading runs…</p>}>
        <IntelRunsListClient className="mt-10" />
      </Suspense>
    </div>
  );
}
