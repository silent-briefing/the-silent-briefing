import { Suspense } from "react";

import { OfficialsHub } from "@/components/operator/officials/OfficialsHub";

export default function OfficialsPage() {
  return (
    <Suspense
      fallback={
        <p className="font-serif text-base italic text-[var(--fg-3)]" aria-busy="true">
          Loading…
        </p>
      }
    >
      <OfficialsHub />
    </Suspense>
  );
}
