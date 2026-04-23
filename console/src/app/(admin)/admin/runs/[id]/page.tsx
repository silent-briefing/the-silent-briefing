import { Suspense } from "react";

import { IntelRunDetailClient } from "@/components/admin/runs/IntelRunDetailClient";

export default async function AdminRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div>
      <Suspense fallback={<p className="font-sans text-sm text-[var(--fg-3)]">Loading…</p>}>
        <IntelRunDetailClient runId={id} />
      </Suspense>
    </div>
  );
}
