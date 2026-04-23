import { Suspense } from "react";

import { OpinionDetailClient } from "@/components/admin/opinions/OpinionDetailClient";

export default async function AdminOpinionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <Suspense fallback={<p className="font-sans text-sm text-[var(--fg-3)]">Loading…</p>}>
        <OpinionDetailClient opinionId={id} />
      </Suspense>
    </div>
  );
}
