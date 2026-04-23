import { Suspense } from "react";

import { SourceEditClient } from "@/components/admin/sources/SourceEditClient";

export default async function AdminSourceEditPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const decoded = decodeURIComponent(key);

  return (
    <div>
      <Suspense fallback={<p className="font-sans text-sm text-[var(--fg-3)]">Loading…</p>}>
        <SourceEditClient settingKey={decoded} className="mt-6" />
      </Suspense>
    </div>
  );
}
