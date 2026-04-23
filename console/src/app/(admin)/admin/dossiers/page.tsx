import { Suspense } from "react";

import { DossierQueueClient } from "@/components/admin/dossiers/DossierQueueClient";

export default function AdminDossiersPage() {
  return (
    <div>
      <p className="font-sans text-sm uppercase tracking-[0.2em] text-[var(--fg-4)]">Admin</p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-primary">Dossiers &amp; claims</h1>
      <p className="mt-3 max-w-prose font-sans text-sm leading-relaxed text-[var(--fg-3)]">
        Review queue for claims flagged for human review. Filter by category or by groundedness ceiling; open an
        official to edit, publish, or reject with notes. Adversarial pipeline rows include critique JSON in metadata.
      </p>
      <Suspense fallback={<p className="mt-10 font-sans text-sm text-[var(--fg-3)]">Loading queue…</p>}>
        <DossierQueueClient className="mt-10" />
      </Suspense>
    </div>
  );
}
