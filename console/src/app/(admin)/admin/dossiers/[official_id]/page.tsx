import { Suspense } from "react";

import { DossierReviewClient } from "@/components/admin/dossiers/DossierReviewClient";

export default async function AdminDossierOfficialPage({
  params,
}: {
  params: Promise<{ official_id: string }>;
}) {
  const { official_id } = await params;

  return (
    <div>
      <Suspense fallback={<p className="font-sans text-sm text-[var(--fg-3)]">Loading…</p>}>
        <DossierReviewClient officialId={official_id} />
      </Suspense>
    </div>
  );
}
